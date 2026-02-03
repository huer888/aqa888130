import { Hono } from 'hono'
import { Bindings } from '../bindings'
import { authMiddleware } from '../middleware'
import { getUpcomingEvents, getEventOdds, normalizeOdds, DetailedMatch } from './betsapi'

const sports = new Hono<{ Bindings: Bindings, Variables: { user: any } }>()

// Helper to get system config
async function getConfig(db: D1Database, key: string): Promise<string | null> {
    const res = await db.prepare('SELECT value FROM system_config WHERE key = ?').bind(key).first<any>()
    return res ? res.value : null
}

// 1. RANKING SYSTEM (Smart Brazil-First Sorting)
function getLeagueRank(name: string, country: string): number {
    const n = name.toLowerCase()
    const c = (country || '').toLowerCase()

    // --- TIER 0: BRAZIL KINGS (Absolute Top) ---
    // Brazil Country Code is usually 'br' in BetsAPI
    if (c === 'br' || n.includes('brazil') || n.includes('brasileir')) {
        if (n.includes('serie a')) return 500 // 🇧🇷 Brasileirão A
        if (n.includes('serie b')) return 490 // 🇧🇷 Brasileirão B
        if (n.includes('copa do brasil')) return 485 // 🇧🇷 Copa do Brasil
        if (n.includes('paulista')) return 480 // SP State
        if (n.includes('carioca')) return 475 // RJ State
        if (n.includes('mineiro') || n.includes('gaucho') || n.includes('baiano')) return 470 // Other Major States
        return 450 // All other Brazil Professional
    }

    // --- TIER 1: CONTINENTAL GIANTS ---
    if (n.includes('libertadores')) return 400 // Libertadores
    if (n.includes('sudamericana')) return 390 // Sudamericana
    if (n.includes('champions league') && n.includes('uefa')) return 380 // Champions League
    if (n.includes('world cup')) return 370

    // --- TIER 2: EUROPEAN BIG 5 ---
    if (c === 'en' || c === 'england') {
        if (n.includes('premier league')) return 300
        if (n.includes('championship')) return 290
    }
    if ((c === 'es' || c === 'spain') && (n.includes('laliga') || n.includes('la liga') || n.includes('primera'))) return 295
    if ((c === 'it' || c === 'italy') && n.includes('serie a')) return 290
    if ((c === 'de' || c === 'germany') && n.includes('bundesliga')) return 285
    if ((c === 'fr' || c === 'france') && n.includes('ligue 1')) return 280

    // --- TIER 3: OTHER POPULAR ---
    if (c === 'pt' || c === 'portugal') return 200 // Portuguese League (Popular in Brazil)
    if (c === 'ar' || c === 'argentina') return 190 // Argentina
    if (c === 'us' || n.includes('mls')) return 180
    if (c === 'sa' || n.includes('saudi')) return 170

    // --- TIER 4: REST OF WORLD ---
    // First Divisions get priority over lower divisions
    if (!n.includes('2') && !n.includes('b') && !n.includes('u21') && !n.includes('women')) return 100

    return 10
}

// 2. GARBAGE FILTER (Aggressive "Wild Chicken" Remover)
function isGarbageLeague(name: string, country: string): boolean {
    const term = (name + ' ' + (country || '')).toLowerCase()
    
    // Whitelist: Always allow these even if they trigger keywords (e.g. "Women's World Cup")
    // But for now, we want strict filtering.

    // BLACKLIST KEYWORDS
    const blacklist = [
        // 1. Fake / Virtual
        'esoccer', 'e-soccer', 'simulated', 'virtual', 'cyber', 'srl', 'battle', 'volta', 'gt league',
        
        // 2. Youth / Kids (The main source of "Wild Chicken")
        'u19', 'u20', 'u21', 'u23', 'u17', 'u18', 'youth', 'junior', 'school', 'university',
        'sub-19', 'sub-20', 'sub-21', // Portuguese Youth
        
        // 3. Reserve / Amateur
        'reserve', 'reserves', 'amateur', 'regional', 'oberliga', 'landesliga', 'interregional', 'colleges',
        
        // 4. Women (Optional: Many operations prefer to hide unless major)
        'women', 'ladies', 'feminin', 'feminino', '(w)', ' w ', 
        
        // 5. Wrong Sports / Formats
        'futsal', 'beach', 'indoor', '3x3', '4x4', '7x7', 'short football',
        'table tennis', 'basketball', 'tennis', 'badminton' // Leakage protection
    ]

    return blacklist.some(bad => term.includes(bad))
}

// --- POISSON DISTRIBUTION ALGORITHM FOR REALISTIC ODDS ---

// Calculate Poisson probability: P(k; lambda) = (lambda^k * e^-lambda) / k!
function poisson(k: number, lambda: number): number {
    let p = Math.exp(-lambda);
    for (let i = 0; i < k; i++) {
        p = p * lambda;
    }
    // Factorial
    let f = 1;
    for (let i = 1; i <= k; i++) f = f * i;
    return p / f;
}

// Generate consistent team strength based on name hash
function getTeamStrength(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
        hash |= 0;
    }
    // Normalized strength between 0.8 (weak) and 2.2 (strong) goals per match
    const seed = Math.abs(hash) % 100;
    return 0.8 + (seed / 100) * 1.4; 
}

// Main Algorithm: Generate Full Market Odds
function generateFallbackOdds(home: string, away: string, rank: number): any {
    // 1. Determine Goal Expectancy (Lambda)
    const homeStrength = getTeamStrength(home);
    const awayStrength = getTeamStrength(away);
    
    // Adjust for Home Advantage (usually +0.3 goals)
    let lambdaHome = homeStrength * 1.15; 
    let lambdaAway = awayStrength * 0.85;

    // Add some noise based on match hash so it's not strictly linear
    const matchStr = home + away + new Date().toISOString().split('T')[0];
    let matchHash = 0;
    for (let i = 0; i < matchStr.length; i++) matchHash = ((matchHash << 5) - matchHash) + matchStr.charCodeAt(i);
    const noise = (Math.abs(matchHash) % 20) / 100; // 0.00 - 0.20
    
    if (matchHash % 2 === 0) lambdaHome += noise; else lambdaAway += noise;

    // 2. Calculate Correct Score Probabilities Matrix (up to 5 goals)
    const maxGoals = 5;
    const scoreProbs: Record<string, number> = {};
    let totalProbCheck = 0;

    for (let h = 0; h <= maxGoals; h++) {
        for (let a = 0; a <= maxGoals; a++) {
            const prob = poisson(h, lambdaHome) * poisson(a, lambdaAway);
            scoreProbs[`${h}-${a}`] = prob;
            totalProbCheck += prob;
        }
    }

    // 3. Derived Markets
    let probHomeWin = 0, probDraw = 0, probAwayWin = 0;
    let probOver25 = 0, probUnder25 = 0;
    let probBTS = 0, probNoBTS = 0;
    const probTotalGoals: number[] = [0,0,0,0,0,0,0]; // 0,1,2,3,4,5+

    for (let h = 0; h <= maxGoals; h++) {
        for (let a = 0; a <= maxGoals; a++) {
            const p = scoreProbs[`${h}-${a}`] || 0;
            
            // 1x2
            if (h > a) probHomeWin += p;
            else if (h === a) probDraw += p;
            else probAwayWin += p;

            // Over/Under 2.5
            if (h + a > 2.5) probOver25 += p; else probUnder25 += p;

            // BTS
            if (h > 0 && a > 0) probBTS += p; else probNoBTS += p;

            // Total Goals
            const total = h + a;
            if (total >= 5) probTotalGoals[5] += p; // 5+
            else probTotalGoals[total] += p;
        }
    }

    // 4. Convert Probabilities to Odds with Margin (House Edge)
    const MARGIN = 1.08; // 8% Margin
    
    const toOdds = (prob: number) => {
        if (prob <= 0.01) return 51.0; // Max cap
        let odds = 1 / prob;
        odds = odds / MARGIN; // Apply margin (lower odds)
        if (odds < 1.12) odds = 1.12; // STRICT FLOOR: Never show 1.01, min 1.12
        if (odds > 51.0) odds = 51.0; // Ceiling
        return Number(odds.toFixed(2));
    };

    // 5. Construct Market Objects
    return {
        '1x2': {
            id: '1x2_ai',
            name: 'Full Time Result',
            outcomes: [
                { id: '1', name: home, price: toOdds(probHomeWin) },
                { id: 'x', name: 'Draw', price: toOdds(probDraw) },
                { id: '2', name: away, price: toOdds(probAwayWin) }
            ]
        },
        'ou_2.5': {
            id: 'ou_ai',
            name: 'Over/Under 2.5',
            outcomes: [
                { id: 'o', name: 'Over 2.5', price: toOdds(probOver25) },
                { id: 'u', name: 'Under 2.5', price: toOdds(probUnder25) }
            ]
        },
        'bts': {
            id: 'bts_ai',
            name: 'Both Teams To Score',
            outcomes: [
                { id: 'y', name: 'Yes', price: toOdds(probBTS) },
                { id: 'n', name: 'No', price: toOdds(probNoBTS) }
            ]
        },
        'dc': {
            id: 'dc_ai',
            name: 'Double Chance',
            outcomes: [
                { id: '1x', name: '1X', price: toOdds(probHomeWin + probDraw) },
                { id: '12', name: '12', price: toOdds(probHomeWin + probAwayWin) },
                { id: 'x2', name: 'X2', price: toOdds(probAwayWin + probDraw) }
            ]
        },
        'cs': {
            id: 'cs_ai',
            name: 'Correct Score',
            outcomes: [
                // Low Scores
                { id: '1-0', name: '1-0', price: toOdds(scoreProbs['1-0']) },
                { id: '2-0', name: '2-0', price: toOdds(scoreProbs['2-0']) },
                { id: '2-1', name: '2-1', price: toOdds(scoreProbs['2-1']) },
                { id: '0-0', name: '0-0', price: toOdds(scoreProbs['0-0']) },
                { id: '1-1', name: '1-1', price: toOdds(scoreProbs['1-1']) },
                { id: '0-1', name: '0-1', price: toOdds(scoreProbs['0-1']) },
                { id: '0-2', name: '0-2', price: toOdds(scoreProbs['0-2']) },
                { id: '1-2', name: '1-2', price: toOdds(scoreProbs['1-2']) },
                { id: '2-2', name: '2-2', price: toOdds(scoreProbs['2-2']) },
                // High Scores (Big Scores)
                { id: '3-0', name: '3-0', price: toOdds(scoreProbs['3-0']) },
                { id: '3-1', name: '3-1', price: toOdds(scoreProbs['3-1']) },
                { id: '3-2', name: '3-2', price: toOdds(scoreProbs['3-2']) },
                { id: '3-3', name: '3-3', price: toOdds(scoreProbs['3-3']) },
                { id: '0-3', name: '0-3', price: toOdds(scoreProbs['0-3']) },
                { id: '1-3', name: '1-3', price: toOdds(scoreProbs['1-3']) },
                { id: '2-3', name: '2-3', price: toOdds(scoreProbs['2-3']) },
                { id: '4-0', name: '4-0', price: toOdds(scoreProbs['4-0']) },
                { id: '4-1', name: '4-1', price: toOdds(scoreProbs['4-1']) },
                { id: '4-2', name: '4-2', price: toOdds(scoreProbs['4-2']) },
                { id: '4-3', name: '4-3', price: toOdds(scoreProbs['4-3']) },
                { id: '0-4', name: '0-4', price: toOdds(scoreProbs['0-4']) },
                { id: '1-4', name: '1-4', price: toOdds(scoreProbs['1-4']) },
                { id: '2-4', name: '2-4', price: toOdds(scoreProbs['2-4']) },
                { id: '3-4', name: '3-4', price: toOdds(scoreProbs['3-4']) },
                { id: 'other', name: 'Other', price: toOdds(0.02) }
            ]
        },
        'tg': {
            id: 'tg_ai',
            name: 'Total Goals',
            outcomes: [
                { id: '0', name: '0', price: toOdds(probTotalGoals[0]) },
                { id: '1', name: '1', price: toOdds(probTotalGoals[1]) },
                { id: '2', name: '2', price: toOdds(probTotalGoals[2]) },
                { id: '3', name: '3', price: toOdds(probTotalGoals[3]) },
                { id: '4', name: '4', price: toOdds(probTotalGoals[4]) },
                { id: '5+', name: '5+', price: toOdds(probTotalGoals[5]) }
            ]
        },
        'htft': {
            id: 'htft_ai',
            name: 'HT/FT',
            // HT/FT is complex to calc purely from FT Poisson, so we use a heuristic based on FT odds
            outcomes: [
                { id: '1/1', name: '1/1', price: toOdds(probHomeWin * 0.6) }, // Home/Home is usually 60% of Home Win prob
                { id: 'x/1', name: 'X/1', price: toOdds(probHomeWin * 0.2) },
                { id: '2/1', name: '2/1', price: toOdds(probHomeWin * 0.05) }, // Comeback is rare
                { id: '1/x', name: '1/X', price: toOdds(probDraw * 0.15) },
                { id: 'x/x', name: 'X/X', price: toOdds(probDraw * 0.6) },
                { id: '2/x', name: '2/X', price: toOdds(probDraw * 0.15) },
                { id: '1/2', name: '1/2', price: toOdds(probAwayWin * 0.05) },
                { id: 'x/2', name: 'X/2', price: toOdds(probAwayWin * 0.2) },
                { id: '2/2', name: '2/2', price: toOdds(probAwayWin * 0.6) }
            ]
        }
    };
}

// --- UPDATE LOGIC (BetsAPI Integration) ---
export async function updateSportsData(env: Bindings) {
    console.log('[Updater] Starting sports data update via BetsAPI...')

    try {
        // 1. Get Upcoming Events
        const allEvents = await getUpcomingEvents(env.ODDS_API_KEY)
        
        // 2. Filter & Sort
        const targetEvents = allEvents.filter(e => {
            const leagueName = e.league?.name || ''
            const country = e.league?.cc || '' 
            
            // Basic validity check
            if (!e.home || !e.away) return false
            
            return !isGarbageLeague(leagueName, country)
        })
        .map(e => ({
            ...e,
            rank: getLeagueRank(e.league?.name || '', e.league?.cc || '')
        }))
        .sort((a, b) => {
             // Sort by Rank DESC, then Time ASC
             if (b.rank !== a.rank) return b.rank - a.rank
             return Number(a.time) - Number(b.time)
        })
        // .slice(0, 500) // REMOVED LIMIT: We want ALL matches fetched by getUpcomingEvents (which is already time-boxed)

        console.log(`[Updater] Processing ${targetEvents.length} events...`)

        // 3. Fetch Odds (Batched)
        const detailedEvents: any[] = []
        
        // Helper for batching
        async function fetchBatched(items: any[], batchSize: number) {
            for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize)
                const promises = batch.map(async (event) => {
                    try {
                        let markets: any = {};
                        let outcomes: any[] = [];
                        let isAlgo = false;

                        // OPTIMIZATION: Only fetch real odds for Top Tier Leagues (Rank >= 150)
                        const isTopTier = event.rank >= 150;

                        if (isTopTier) {
                            try {
                                const oddsData = await getEventOdds(event.id, env.ODDS_API_KEY)
                                if (oddsData) {
                                    const normalized = normalizeOdds(event, oddsData)
                                    markets = normalized.markets;
                                }
                            } catch(e) {}
                        }

                        // HYBRID STRATEGY: Even if we have some real markets, we might miss others (like CS/HTFT)
                        // So we generate ALGO odds and MERGE them.
                        // Real odds overwrite Algo odds if they exist.
                        
                        const algoMarkets = generateFallbackOdds(event.home.name, event.away.name, event.rank);
                        
                        // Merge: Real markets take precedence, but if missing, Algo fills the gap
                        // This ensures 'cs', 'htft', 'tg' are ALWAYS present
                        markets = { ...algoMarkets, ...markets };
                        
                        // Force Algo flag to false if we have at least one real market (1x2) to avoid yellow dot on all
                        // But actually, for mixed data, maybe we don't show the dot.
                        // Let's only show Algo dot if 1x2 is Algo.
                        const isAlgo1x2 = markets['1x2']?.id === '1x2_algo';

                        // Prepare standard 1x2 outcomes
                        if (markets['1x2']) {
                             outcomes = markets['1x2'].outcomes;
                        }

                        return {
                            id: event.id,
                            league_id: event.league.id,
                            league_name: event.league.name,
                            country: event.league.cc || 'World',
                            commence_time: new Date(Number(event.time) * 1000).toISOString(),
                            home_team: event.home.name,
                            away_team: event.away.name,
                            home_id: event.home.id,
                            away_id: event.away.id,
                            rank: event.rank,
                            markets: markets,
                            outcomes: outcomes,
                            is_algo: isAlgo1x2
                        }
                    } catch (e) {
                        return null
                    }
                })
                
                const results = await Promise.all(promises)
                results.forEach(r => { if(r) detailedEvents.push(r) })
                
                // Increased delay to 1s to be safe
                if (i + batchSize < items.length) {
                    await new Promise(r => setTimeout(r, 1000)) 
                }
            }
        }

        // High Parallelism since most are Algo
        // REDUCED BATCH SIZE for rate limiting (was 50)
        await fetchBatched(targetEvents, 10) 

        // --- PRODUCTION PROTECTION (CIRCUIT BREAKER) ---
        // 1. Safety Check: If we got 0 detailed events, something is likely wrong with the API or Network.
        if (detailedEvents.length === 0 && targetEvents.length > 0) {
            console.error('[Updater] CRITICAL: No detailed odds fetched. Aborting DB update to prevent data loss.')
            return
        }

        // 2. Volume Check: Check existing data volume
        try {
            const currentCache = await env.DB.prepare("SELECT data FROM sports_cache WHERE key = 'all_events'").first<any>();
            if (currentCache && currentCache.data) {
                const oldLeagues = JSON.parse(currentCache.data);
                const oldEventCount = oldLeagues.reduce((acc: number, l: any) => acc + l.events.length, 0);
                const newEventCount = detailedEvents.length;

                // If new data is less than 50% of old data (and old data > 100), trigger breaker
                if (oldEventCount > 100 && newEventCount < (oldEventCount * 0.5)) {
                    console.error(`[Updater] CRITICAL: Abnormal data drop detected (Old: ${oldEventCount} -> New: ${newEventCount}). Aborting update.`);
                    return;
                }
            }
        } catch(e) {
            console.warn('[Updater] Could not verify existing cache, proceeding with caution.');
        }

        console.log(`[Updater] Successfully fetched odds for ${detailedEvents.length} events`)

        // --- CACHE PROTECTION: Prevent overwriting good cache with bad data ---
        if (detailedEvents.length === 0) {
             const existing = await env.DB.prepare("SELECT data FROM sports_cache WHERE key = 'all_events'").first<any>();
             
             // If we have valid history, keep it.
             if (existing && existing.data && existing.data.length > 5) {
                  console.error('[Updater] API returned 0 events but cache exists. ABORTING overwrite to preserve history.');
                  return;
             }
             
             // If cache is empty AND we failed (e.g. Rate Limit), generate dummy data so user sees something
             // This is the "Emergency Fallback"
             console.warn('[Updater] No data and no cache. Generating Fallback Data to prevent empty screen.');
             const dummyEvents = [
                {
                    id: 'fallback_league_1',
                    name: 'English Premier League (Fallback)',
                    country: 'en',
                    rank: 300,
                    events: [
                        { id: 'f1', home_team: 'Manchester City', away_team: 'Liverpool', commence_time: new Date(Date.now() + 3600000).toISOString(), outcomes: [{name:'Manchester City', price: 2.1}, {name:'Draw', price: 3.5}, {name:'Liverpool', price: 3.2}] },
                        { id: 'f2', home_team: 'Arsenal', away_team: 'Chelsea', commence_time: new Date(Date.now() + 7200000).toISOString(), outcomes: [{name:'Arsenal', price: 1.8}, {name:'Draw', price: 3.8}, {name:'Chelsea', price: 4.5}] }
                    ]
                }
             ];
             
             await env.DB.prepare(`
                INSERT INTO sports_cache (key, data, updated_at) 
                VALUES ('all_events', ?, ?)
                ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
            `).bind(JSON.stringify(dummyEvents), Date.now()).run();
            
            return dummyEvents;
        }

        // 4. Group by League
        const leaguesMap = new Map()
        detailedEvents.forEach((event: any) => {
            if (!leaguesMap.has(event.league_id)) {
                leaguesMap.set(event.league_id, {
                    id: event.league_id,
                    name: event.league_name,
                    country: event.country,
                    rank: event.rank,
                    events: []
                })
            }
            leaguesMap.get(event.league_id).events.push(event)
        })

        const leagues = Array.from(leaguesMap.values())
        // Sort leagues by rank
        leagues.sort((a: any, b: any) => b.rank - a.rank)
        
        // Sort events inside leagues
        leagues.forEach((league: any) => {
            league.events.sort((a: any, b: any) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime())
        })

        // 5. Save to DB
        await env.DB.prepare(`
            INSERT INTO sports_cache (key, data, updated_at) 
            VALUES ('all_events', ?, ?)
            ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
        `).bind(JSON.stringify(leagues), Date.now()).run()

        return leagues

    } catch (e) {
        console.error('[Updater] Failed:', e)
    }
}

// --- ENDPOINTS ---

// GET /events - Fast, Cached
sports.get('/events', async (c) => {
    // 1. Try Read Cache
    const cache = await c.env.DB.prepare('SELECT data, updated_at FROM sports_cache WHERE key = ?').bind('all_events').first<any>()
    
    let allLeagues: any[] = []

    if (cache && cache.data) {
        allLeagues = JSON.parse(cache.data)
        const age = Date.now() - cache.updated_at
        // Check age (10 minutes = 600000ms)
        if (age > 600000) {
             // Cache stale -> Trigger async update (fire and forget)
             setTimeout(() => {
                 updateSportsData(c.env).catch(e => console.error('[Background Updater Error]', e))
             }, 0)
        }
    } else {
         // If no cache, force update (background)
         updateSportsData(c.env).catch(e => console.error('[Initial Update Error]', e))
    }

    // 2. Fetch Manual Matches
    const { results: manualMatches } = await c.env.DB.prepare("SELECT * FROM manual_matches WHERE status = 'active' AND commence_time > datetime('now', '-4 hours')").all()
    
    // 3. Merge Manual Matches
    if (manualMatches && manualMatches.length > 0) {
        manualMatches.forEach((m: any) => {
            const leagueName = m.league_name
            const country = 'Manual' 

            // Find existing league or create new
            let league = allLeagues.find((l: any) => l.name === leagueName)
            if (!league) {
                league = {
                    id: `manual_league_${Date.now()}`,
                    name: leagueName,
                    country: country,
                    rank: 1000, // High rank to show on top
                    events: []
                }
                allLeagues.unshift(league) // Add to top
            }

            // Create Event Object
            const event = {
                id: m.id,
                league_id: league.id,
                league_name: leagueName,
                country: country,
                rank: league.rank,
                commence_time: m.commence_time,
                home_team: m.home_team,
                away_team: m.away_team,
                outcomes: [
                    { name: m.home_team, price: m.home_odds },
                    { name: 'Draw', price: m.draw_odds },
                    { name: m.away_team, price: m.away_odds }
                ]
            }
            
            // Add to league events if not exists (check ID)
            if (!league.events.find((e: any) => e.id === event.id)) {
                league.events.push(event)
            }
        })
    }

    // Sort manual leagues to top if they were newly created
    // But since we unshifted, they might be there. 
    // Let's re-sort the events inside modified leagues by time
    allLeagues.forEach(l => {
        l.events.sort((a: any, b: any) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime())
    })

    return c.json(allLeagues)
})

// POST /cron/update - Force Update
sports.post('/cron/update', async (c) => {
    await updateSportsData(c.env)
    return c.json({ success: true })
})

// Get My Bets
sports.get('/my-bets', authMiddleware, async (c) => {
  const userId = c.get('user').id
  const { results } = await c.env.DB.prepare('SELECT * FROM bets WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').bind(userId).all()
  return c.json(results)
})

// Place Bet
sports.post('/bet', authMiddleware, async (c) => {
  const userId = c.get('user').id
  const body = await c.req.json()
  
  // Support both Single and Parlay (Multiple) bets
  const isParlay = Array.isArray(body.items)
  const amount = Number(body.amount)
  
  if (!amount || amount <= 0) return c.json({ error: 'Invalid amount' }, 400)

  // 1. Check Balance
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<any>()
  const totalFunds = (user.balance || 0) + (user.bonus || 0)
  
  if (totalFunds < amount) {
    return c.json({ error: 'Saldo insuficiente' }, 400)
  }

  const ticketId = `TK-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  
  try {
    const batch = []
    
    // Deduct Logic: Priority Bonus -> Balance
    const bonusToDeduct = Math.min(user.bonus || 0, amount)
    const balanceToDeduct = amount - bonusToDeduct
    
    if (bonusToDeduct > 0) {
        batch.push(c.env.DB.prepare('UPDATE users SET bonus = bonus - ? WHERE id = ?').bind(bonusToDeduct, userId))
    }
    
    if (balanceToDeduct > 0) {
        batch.push(c.env.DB.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').bind(balanceToDeduct, userId))
    }

    let potentialPayout = 0;

    if (isParlay) {
        // Parlay Logic
        // Calculate total odds
        const totalOdds = body.items.reduce((acc: number, item: any) => acc * item.odds, 1)
        potentialPayout = amount * totalOdds
        
        // Store as a single bet record but with special type/info
        // Since we don't have a 'parlay' table, we store JSON in match_info or create a composite record
        // Let's use the existing 'bets' table. 
        // match_id = 'parlay', selection = 'Parlay (N Folds)', odds = totalOdds
        
        const parlayInfo = {
            type: 'parlay',
            legs: body.items.map((i: any) => ({
                match: `${i.matchInfo.home} vs ${i.matchInfo.away}`,
                selection: i.selection,
                odds: i.odds,
                matchId: i.matchId
            }))
        }

        batch.push(
            c.env.DB.prepare(`
                INSERT INTO bets (ticket_id, user_id, match_id, match_info, selection, odds, amount, potential_payout, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            `).bind(ticketId, userId, 'parlay', JSON.stringify(parlayInfo), `Parlay (${body.items.length} legs)`, totalOdds, amount, potentialPayout)
        )

        batch.push(
            c.env.DB.prepare(`
                INSERT INTO transactions (user_id, type, amount, status, note)
                VALUES (?, 'bet', ?, 'completed', ?)
            `).bind(userId, amount, `Parlay Bet (${body.items.length} legs)`)
        )

    } else {
        // Single Bet Logic (Legacy compatible)
        const { matchId, selection, odds, matchInfo } = body
        potentialPayout = amount * odds
        
        batch.push(
            c.env.DB.prepare(`
                INSERT INTO bets (ticket_id, user_id, match_id, match_info, selection, odds, amount, potential_payout, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            `).bind(ticketId, userId, matchId, JSON.stringify(matchInfo), selection, odds, amount, potentialPayout)
        )
        
        batch.push(
            c.env.DB.prepare(`
                INSERT INTO transactions (user_id, type, amount, status, note)
                VALUES (?, 'bet', ?, 'completed', ?)
            `).bind(userId, amount, `Bet on ${matchInfo.home} vs ${matchInfo.away}`)
        )
    }

    // 3. Commission Logic (Instant Rebate to Balance)
    const toFixed2 = (n: number) => Math.round(n * 100) / 100
    const selfCommission = toFixed2(amount * user.commission_rate)
    
    // Credit main balance directly (Instant Rebate)
    batch.push(
       c.env.DB.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').bind(selfCommission, userId)
    )
    
    // Log as 'commission' type but note it went to balance
    batch.push(
       c.env.DB.prepare(`INSERT INTO transactions (user_id, type, amount, status, note) VALUES (?, 'commission', ?, 'completed', 'Instant Rebate to Balance')`).bind(userId, selfCommission)
    )

    // Upline Differential
    if (user.parent_id) {
        const parent = await c.env.DB.prepare('SELECT id, commission_rate FROM users WHERE id = ?').bind(user.parent_id).first<any>()
        if (parent && parent.commission_rate > user.commission_rate) {
            const diff = parent.commission_rate - user.commission_rate
            const uplineComm = toFixed2(amount * diff)
             batch.push(
                c.env.DB.prepare('UPDATE users SET commission_balance = commission_balance + ? WHERE id = ?').bind(uplineComm, parent.id)
             )
             batch.push(
                c.env.DB.prepare(`INSERT INTO transactions (user_id, type, amount, status, note) VALUES (?, 'commission', ?, 'completed', 'Differential from sub-agent')`).bind(parent.id, uplineComm)
             )
        }
    }

    await c.env.DB.batch(batch)
    return c.json({ success: true, ticketId, potentialPayout })

  } catch (e) {
    console.error(e)
    return c.json({ error: 'Bet processing failed' }, 500)
  }
})

export default sports
