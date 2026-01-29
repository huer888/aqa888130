import { Hono } from 'hono'
import { Bindings } from '../bindings'
import { authMiddleware } from '../middleware'

const sports = new Hono<{ Bindings: Bindings, Variables: { user: any } }>()

// Helper to get system config
async function getConfig(db: D1Database, key: string): Promise<string | null> {
    const res = await db.prepare('SELECT value FROM system_config WHERE key = ?').bind(key).first<any>()
    return res ? res.value : null
}

// 1. RANKING SYSTEM (For Sorting)
function getLeagueRank(name: string, country: string): number {
    const n = name.toLowerCase()
    const c = country.toLowerCase()

    // Tier 1: World Cup & Major International (Absolute Top)
    if (n.includes('world cup')) return 200
    if (n.includes('champions league') && n.includes('uefa')) return 190

    // Tier 2: Big 5 Europe (Premier, La Liga, etc.)
    if (n.includes('premier league') && c.includes('england')) return 180
    if (n.includes('la liga') || (n.includes('primera') && c.includes('spain'))) return 175
    if (n.includes('bundesliga') && c.includes('germany')) return 170
    if (n.includes('serie a') && c.includes('italy')) return 165
    if (n.includes('ligue 1') && c.includes('france')) return 160

    // Tier 3: Brazil Tier 1 (High Priority but below Big 5)
    if (c.includes('brazil') || n.includes('brasileir')) {
         if (n.includes('serie a')) return 150
         if (n.includes('serie b')) return 145
         if (n.includes('paulista') || n.includes('carioca')) return 140
         return 130 // Other states
    }
    
    // Tier 4: Continental
    if (n.includes('libertadores')) return 120
    if (n.includes('sudamericana')) return 110

    // Tier 5: Popular Global
    if (n.includes('nba')) return 85
    if (c.includes('portugal') && n.includes('primeira')) return 80
    if (c.includes('netherlands') && n.includes('eredivisie')) return 79
    if (c.includes('turkey') && n.includes('super lig')) return 78
    if (c.includes('saudi') && n.includes('pro')) return 77 
    if (n.includes('mls') || c.includes('usa')) return 76

    // Tier 6: Other Top Divisions
    if (!n.includes('2') && !n.includes('b') && !n.includes('beta')) return 50

    return 10
}

// 2. GARBAGE FILTER (The "Gatekeeper")
function isGarbageLeague(name: string, country: string): boolean {
    const term = (name + ' ' + country).toLowerCase()
    
    // Keywords to BAN
    const blacklist = [
        'esoccer', 'e-soccer', 'simulated', 'virtual', 'cyber', // Fake stuff
        'u17', 'u19', 'u20', 'u21', 'u23', 'youth', // Kids
        'amateur', 'regional', 'oberliga', 'landesliga', 'non league', // Amateurs
        'reserve', 'women', '(w)', // Low volume
        'futsal', 'beach', // Non-field
        'friendlies' // Often unreliable
    ]

    return blacklist.some(bad => term.includes(bad))
}

// --- UPDATE LOGIC (Slow, Heavy) ---
export async function updateSportsData(env: Bindings) {
    let apiKey = await getConfig(env.DB, 'odds_api_key')
    if (!apiKey || apiKey.length < 10) apiKey = env.ODDS_API_KEY
    if (!apiKey) return

    const baseUrl = 'https://api.oddspapi.io/v4'
    console.log('[Updater] Starting sports data update...')

    try {
        // 1. Get Tournaments
        const leaguesRes = await fetch(`${baseUrl}/tournaments?apiKey=${apiKey}&sportId=10`)
        if (!leaguesRes.ok) throw new Error('API Error Tournaments')
        const allTournaments = await leaguesRes.json()

        const priorityKeywords = ['Brazil', 'Brasileirão', 'Premier League', 'Bundesliga', 'La Liga', 'Serie A', 'Ligue 1', 'Champions League', 'Libertadores', 'World Cup', 'Euro', 'Copa América']
        
        // Filter Active & Quality
        const activeTournaments = allTournaments.filter((t: any) => (t.upcomingFixtures > 0 || t.futureFixtures > 0 || t.liveFixtures > 0))
        
        const targetTournaments = activeTournaments.filter((t: any) => {
            if (isGarbageLeague(t.tournamentName, t.categoryName)) return false
            // Keep everything else as requested ("Mostly keep other regions")
            return true
        })
        .sort((a: any, b: any) => {
             const aP = priorityKeywords.some(k => a.tournamentName.includes(k) || a.categoryName.includes(k))
             const bP = priorityKeywords.some(k => b.tournamentName.includes(k) || b.categoryName.includes(k))
             if (aP && !bP) return -1
             if (!aP && bP) return 1
             return 0
        })
        .slice(0, 100) // 100 Leagues! This will take ~2 minutes to update but that's fine for background cache.

        console.log(`[Updater] Targeting ${targetTournaments.length} leagues (Heavy Load)`)

        // 2. Fetch Fixtures (Batched)
        const from = new Date().toISOString().split('T')[0]
        const to = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] 
        
        async function fetchBatched(items: any[], batchSize: number, fn: (item: any) => Promise<any>) {
            const results = []
            for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize)
                const batchResults = await Promise.all(batch.map(fn))
                results.push(...batchResults)
                await new Promise(r => setTimeout(r, 1200)) // 1.2s delay to prevent 429
            }
            return results
        }

        const leagueRequests = async (t: any) => {
            try {
                const url = `${baseUrl}/fixtures?apiKey=${apiKey}&tournamentId=${t.tournamentId}&from=${from}&to=${to}`
                const res = await fetch(url)
                if (!res.ok) {
                    console.error(`[Updater] Failed ${t.tournamentName}: ${res.status}`)
                    return []
                }
                const fixtures = await res.json()
                if (!Array.isArray(fixtures)) return []
                return fixtures.map((f: any) => ({
                    ...f,
                    league_name: t.tournamentName,
                    country: t.categoryName,
                    full_league_name: `${t.categoryName} - ${t.tournamentName}`
                }))
            } catch (e) {
                return []
            }
        }

        const results = await fetchBatched(targetTournaments, 3, leagueRequests)
        const allFixtures: any[] = []
        results.forEach((list: any) => { if(Array.isArray(list)) allFixtures.push(...list) })

        console.log(`[Updater] Fetched ${allFixtures.length} fixtures`)

        // 3. Process
        const processedEvents = allFixtures
            .filter((f: any) => new Date(f.startTime) > new Date()) 
            .map((f: any) => {
                const hash = f.fixtureId.split('').reduce((a:number,b:string)=>a+b.charCodeAt(0),0)
                const baseHome = 1.2 + (hash % 300) / 100 
                const baseDraw = 2.8 + (hash % 150) / 100 
                const baseAway = 1.2 + ((hash * 3) % 400) / 100 

                // Generate Over/Under 2.5
                const ouBase = 1.85 + ((hash % 20) - 10) / 100
                const over = ouBase
                const under = 3.7 - ouBase // Roughly balance to ~1.85 avg

                // Generate Double Chance (Approximation)
                // 1/Home + 1/Draw
                const dc1x = 1 / ((1/baseHome) + (1/baseDraw)) * 1.05
                const dc12 = 1 / ((1/baseHome) + (1/baseAway)) * 1.05
                const dcx2 = 1 / ((1/baseDraw) + (1/baseAway)) * 1.05

                return {
                    id: f.fixtureId,
                    league_id: f.tournamentId,
                    league_name: f.full_league_name, 
                    country: f.country,
                    rank: getLeagueRank(f.league_name, f.country),
                    commence_time: f.startTime,
                    home_team: f.participant1Name,
                    away_team: f.participant2Name,
                    outcomes: [
                        { name: f.participant1Name, price: Number(baseHome.toFixed(2)) },
                        { name: 'Draw', price: Number(baseDraw.toFixed(2)) },
                        { name: f.participant2Name, price: Number(baseAway.toFixed(2)) }
                    ],
                    markets: {
                        h2h: [
                            { name: f.participant1Name, price: Number(baseHome.toFixed(2)) },
                            { name: 'Draw', price: Number(baseDraw.toFixed(2)) },
                            { name: f.participant2Name, price: Number(baseAway.toFixed(2)) }
                        ],
                        totals: [ // Over/Under 2.5
                            { name: 'Over 2.5', price: Number(over.toFixed(2)) },
                            { name: 'Under 2.5', price: Number(under.toFixed(2)) }
                        ],
                        double_chance: [
                            { name: '1X', price: Number(dc1x.toFixed(2)) },
                            { name: '12', price: Number(dc12.toFixed(2)) },
                            { name: 'X2', price: Number(dcx2.toFixed(2)) }
                        ]
                    }
                }
            })

        // 4. Group
        const leaguesMap = new Map()
        processedEvents.forEach((event: any) => {
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
        leagues.sort((a: any, b: any) => {
            if (b.rank !== a.rank) return b.rank - a.rank
            const aTime = a.events[0] ? new Date(a.events[0].commence_time).getTime() : 0
            const bTime = b.events[0] ? new Date(b.events[0].commence_time).getTime() : 0
            return aTime - bTime
        })
        leagues.forEach((league: any) => {
            league.events.sort((a: any, b: any) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime())
        })

        // 5. Save to DB
        await env.DB.prepare(`
            INSERT INTO sports_cache (key, data, updated_at) 
            VALUES ('all_events', ?, ?)
            ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
        `).bind(JSON.stringify(leagues), Date.now()).run()

        console.log('[Updater] Cache updated successfully')
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
            const mOver = 1.90
            const mUnder = 1.90
            const m1x = 1.10
            const m12 = 1.10
            const mx2 = 1.10

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
                ],
                markets: {
                    h2h: [
                        { name: m.home_team, price: m.home_odds },
                        { name: 'Draw', price: m.draw_odds },
                        { name: m.away_team, price: m.away_odds }
                    ],
                    totals: [
                        { name: 'Over 2.5', price: mOver },
                        { name: 'Under 2.5', price: mUnder }
                    ],
                    double_chance: [
                        { name: '1X', price: m1x },
                        { name: '12', price: m12 },
                        { name: 'X2', price: mx2 }
                    ]
                }
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
  const { matchId, selection, odds, amount, matchInfo } = await c.req.json()

  // 1. Check Balance
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<any>()
  if (user.balance < amount) {
    return c.json({ error: 'Saldo insuficiente' }, 400)
  }

  const ticketId = `TK-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  const potentialPayout = amount * odds

  try {
    const batch = [
      // Deduct Balance
      c.env.DB.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').bind(amount, userId),
      // Create Bet
      c.env.DB.prepare(`
        INSERT INTO bets (ticket_id, user_id, match_id, match_info, selection, odds, amount, potential_payout, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `).bind(ticketId, userId, matchId, JSON.stringify(matchInfo), selection, odds, amount, potentialPayout),
      // Create Transaction Record (Bet)
      c.env.DB.prepare(`
        INSERT INTO transactions (user_id, type, amount, status, note)
        VALUES (?, 'bet', ?, 'completed', ?)
      `).bind(userId, amount, `Bet on ${matchInfo.home} vs ${matchInfo.away}`)
    ]

    // 3. Commission Logic (Instant Rebate to Balance)
    const selfCommission = amount * user.commission_rate
    
    // Credit main balance directly (Instant Rebate)
    batch.push(
       c.env.DB.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').bind(selfCommission, userId)
    )
    
    // Log as 'commission' type but note it went to balance
    batch.push(
       c.env.DB.prepare(`INSERT INTO transactions (user_id, type, amount, status, note) VALUES (?, 'commission', ?, 'completed', 'Instant Rebate to Balance')`).bind(userId, selfCommission)
    )

    // Upline Differential (Still goes to commission_balance for upline)
    if (user.parent_id) {
        const parent = await c.env.DB.prepare('SELECT id, commission_rate FROM users WHERE id = ?').bind(user.parent_id).first<any>()
        if (parent && parent.commission_rate > user.commission_rate) {
            const diff = parent.commission_rate - user.commission_rate
            const uplineComm = amount * diff
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
    return c.json({ error: 'Bet processing failed' }, 500)
  }
})

export default sports
