
import { Bindings } from '../bindings'

const BASE_URL = 'https://api.b365api.com/v1'

interface BetsApiEvent {
    id: string
    sport_id: string
    time: string
    league: { id: string, name: string, cc?: string }
    home: { id: string, name: string, image_id?: string, cc?: string }
    away: { id: string, name: string, image_id?: string, cc?: string }
}

export interface NormalizedMarket {
    id: string // Market ID or Unique Key
    name: string // "Full Time Result", "Over/Under 2.5"
    outcomes: {
        id: string
        name: string // "Home", "Over", "Yes"
        price: number
    }[]
}

export interface DetailedMatch {
    id: string
    league_id: string
    league_name: string
    country: string
    commence_time: string
    home_team: string
    away_team: string
    home_id: string
    away_id: string
    markets: Record<string, NormalizedMarket> // keyed by type '1x2', 'ou', 'dc', etc.
}

// Helper: Generate Dummy Events - REMOVED PER USER REQUEST
function getDummyEvents(): BetsApiEvent[] {
    return []
}

// Fetch Upcoming Events (Smart Pagination for Next 7 Days)
export async function getUpcomingEvents(apiKey: string): Promise<BetsApiEvent[]> {
    try {
        let allEvents: BetsApiEvent[] = []
        
        // Randomize User Agent to avoid detection
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        };

        // Retry logic helper
        async function fetchWithRetry(url: string, retries = 3) {
            for(let i=0; i<retries; i++) {
                try {
                    const res = await fetch(url, { headers });
                    
                    // Critical: Check for Rate Limit (429)
                    if (res.status === 429) {
                        const resetTime = res.headers.get('x-ratelimit-reset');
                        console.warn(`[BetsAPI] RATE LIMIT EXCEEDED (429). Reset at: ${new Date(Number(resetTime)*1000).toISOString()}`);
                        return { success: false, error: 'RATE_LIMIT', reset: resetTime };
                    }

                    if(res.ok) {
                        const text = await res.text();
                        try {
                            return JSON.parse(text);
                        } catch (e) {
                            console.error('[BetsAPI] JSON Parse Error (HTML response?):', text.substring(0, 100));
                            return { success: false, error: 'INVALID_JSON' };
                        }
                    }
                } catch(e) {
                    await new Promise(r => setTimeout(r, 1000 * (i+1))); // Exponential backoff
                }
            }
            return { success: false };
        }
        
        // 1. Fetch First Page to get Total Pages
        console.log('[BetsAPI] Fetching page 1 to determine total size (Using Bet365 Source)...')
        // Using ENV KEY is handled by the caller or global config? The caller passes 'apiKey'.
        // Ensuring we log if key is empty
        if(!apiKey || apiKey.length < 5) console.warn('[BetsAPI] Warning: API Key looks invalid:', apiKey)

        const firstData = await fetchWithRetry(`${BASE_URL}/bet365/upcoming?sport_id=1&token=${apiKey}&page=1`)
        
        if (!firstData.success || !firstData.pager) {
            console.error('[BetsAPI] Failed to fetch first page. Status:', firstData.success)
            return [] // Return empty to indicate failure, NO FAKE DATA
        }

        const totalItems = firstData.pager.total
        const perPage = firstData.pager.per_page
        const totalPages = Math.ceil(totalItems / perPage)
        
        // Add first page results
        if (Array.isArray(firstData.results)) {
            allEvents.push(...firstData.results)
        }

        console.log(`[BetsAPI] Found ${totalItems} total events across ${totalPages} pages. Starting bulk fetch...`)

        // 2. Fetch Remaining Pages (Max 10 pages to save API calls)
        const MAX_PAGES = Math.min(totalPages, 10); 
        const pendingPages = []
        for(let i=2; i<=MAX_PAGES; i++) pendingPages.push(i)

        // SEQUENTIAL BATCHING (Slower but Safer)
        const BATCH_SIZE = 5; // 5 requests at a time
        
        for (let i = 0; i < pendingPages.length; i += BATCH_SIZE) {
            const batch = pendingPages.slice(i, i + BATCH_SIZE);
            console.log(`[BetsAPI] Fetching pages batch ${i/BATCH_SIZE + 1}...`);
            
            const batchResults = await Promise.all(batch.map(async (page) => {
                try {
                    const data = await fetchWithRetry(`${BASE_URL}/bet365/upcoming?sport_id=1&token=${apiKey}&page=${page}`, 2)
                    return (data.success && Array.isArray(data.results)) ? data.results : []
                } catch(e) { return [] }
            }))
            
            batchResults.forEach(list => allEvents.push(...list))
            
            // Delay between batches to respect rate limit
            await new Promise(r => setTimeout(r, 1000));
        }

        // 3. Time Filter (Strict 7 Days Window)
        const now = Math.floor(Date.now() / 1000)
        const eightDaysLater = now + (8 * 24 * 60 * 60)
        
        const finalEvents = allEvents.filter(e => {
            const t = Number(e.time)
            return t >= now && t <= eightDaysLater
        })
        
        // Deduplicate by ID
        const uniqueEvents = Array.from(new Map(finalEvents.map(item => [item.id, item])).values());
        
        console.log(`[BetsAPI] Final unique events count for next 7 days: ${uniqueEvents.length}`)
        return uniqueEvents

    } catch (e) {
        console.error('BetsAPI Events Error:', e)
        return []
    }
}

// Fetch Odds for an Event
export async function getEventOdds(eventId: string, apiKey: string): Promise<any> {
    try {
        const headers = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };
        const res = await fetch(`${BASE_URL}/bet365/prematch?token=${apiKey}&event_id=${eventId}`, { headers })
        
        if (!res.ok) {
            if (res.status === 429) console.warn(`[BetsAPI] Odds Rate Limit (429) for ${eventId}`);
            return null;
        }

        const text = await res.text();
        try {
            const data = JSON.parse(text);
            if (data.success && Array.isArray(data.results) && data.results.length > 0) {
                return data.results[0]
            }
        } catch (e) {
            // Silent fail for invalid JSON (HTML error pages) to keep logs clean
            // console.error(`[BetsAPI] Odds JSON Error ${eventId}:`, text.substring(0, 50));
            return null;
        }
        return null
    } catch (e) {
        console.error(`BetsAPI Odds Error ${eventId}:`, e)
        return null
    }
}

// Fetch Match Result
export async function getMatchResult(eventId: string, apiKey: string): Promise<any> {
    try {
        const headers = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };
        const res = await fetch(`${BASE_URL}/event/view?token=${apiKey}&event_id=${eventId}`, { headers })
        
        if (!res.ok) return null;

        const text = await res.text();
        try {
            const data = JSON.parse(text);
            if (data.success && Array.isArray(data.results) && data.results.length > 0) {
                return data.results[0]
            }
        } catch (e) {
            // console.error(`[BetsAPI] Result JSON Error ${eventId}`, text.substring(0, 50));
            return null;
        }
        return null
    } catch (e) {
        console.error(`BetsAPI Result Error ${eventId}:`, e)
        return null
    }
}

// Normalize the Messy BetsAPI Structure
export function normalizeOdds(event: BetsApiEvent, oddsData: any): DetailedMatch {
    const markets: Record<string, NormalizedMarket> = {}
    
    // 1. Full Time Result (1x2)
    if (oddsData?.main?.sp?.full_time_result) {
        const raw = oddsData.main.sp.full_time_result
        // Usually array: [ {header: home, odds}, {header: draw, odds}, {header: away, odds} ]
        // Or sometimes generic headers. We map by index or team name match.
        
        const outcomes = []
        // BetsAPI order is usually Home, Draw, Away. Verify with headers.
        raw.forEach((o: any) => {
             let name = o.header
             // Clean names
             if (name === event.home.name) name = event.home.name
             if (name === event.away.name) name = event.away.name
             outcomes.push({
                 id: o.id,
                 name: name,
                 price: Number(o.odds)
             })
        })

        if (outcomes.length >= 3) {
            markets['1x2'] = {
                id: '1x2',
                name: 'Full Time Result',
                outcomes: outcomes
            }
        }
    }

    // 2. Double Chance
    if (oddsData?.main?.sp?.double_chance) {
        const raw = oddsData.main.sp.double_chance
        const outcomes = raw.map((o: any) => ({
            id: o.id,
            name: o.header, // "Home/Draw", etc.
            price: Number(o.odds)
        }))
        markets['dc'] = { id: 'dc', name: 'Double Chance', outcomes }
    }

    // 3. Both Teams To Score
    if (oddsData?.main?.sp?.both_teams_to_score) {
        const raw = oddsData.main.sp.both_teams_to_score
        const outcomes = raw.map((o: any) => ({
            id: o.id,
            name: o.header, // "Yes", "No"
            price: Number(o.odds)
        }))
        markets['bts'] = { id: 'bts', name: 'Both Teams To Score', outcomes }
    }

    // 4. Goals Over/Under (Asian Lines or Goals)
    // Try 'goals.sp.match_goals' (Standard) or 'asian_lines.sp.goal_line'
    let goalsRaw = oddsData?.goals?.sp?.match_goals || oddsData?.asian_lines?.sp?.goal_line
    
    if (goalsRaw && Array.isArray(goalsRaw)) {
        // ... (existing logic)
        // Find standard 2.5
        // ...
        
        // REWRITE: Better Over/Under parsing
        // We want 2.5 primarily
        let ouLine = null
        
        // Try to find exact 2.5 line first
        // BetsAPI structure varies. Sometimes it's a flat list.
        // Let's iterate and look for "2.5" in headers or names
        for(let i=0; i<goalsRaw.length; i++) {
            const item = goalsRaw[i]
            // Case A: Header row + Over/Under rows (Triplet)
            if (item.name && item.name.includes('2.5') && !item.odds) {
                const over = goalsRaw[i+1]
                const under = goalsRaw[i+2]
                if (over?.header === 'Over' && under?.header === 'Under') {
                     ouLine = {
                        id: `ou_2.5`,
                        name: `Over/Under 2.5`,
                        outcomes: [
                            { id: over.id, name: `Over 2.5`, price: Number(over.odds) },
                            { id: under.id, name: `Under 2.5`, price: Number(under.odds) }
                        ]
                     }
                     break
                }
            }
        }
        
        // Fallback: Just take the first valid line if 2.5 not found
        if (!ouLine && goalsRaw.length >= 3) {
             // Try to parse the first triplet
             const line = goalsRaw[0].name
             const over = goalsRaw[1]
             const under = goalsRaw[2]
             if (line && over?.header === 'Over') {
                  ouLine = {
                        id: `ou_main`,
                        name: `Over/Under ${line}`,
                        outcomes: [
                            { id: over.id, name: `Over ${line}`, price: Number(over.odds) },
                            { id: under.id, name: `Under ${line}`, price: Number(under.odds) }
                        ]
                  }
             }
        }

        if (ouLine) markets['ou_2.5'] = ouLine
    }

    // 5. Correct Score (CS)
    if (oddsData?.main?.sp?.correct_score) {
        const raw = oddsData.main.sp.correct_score
        const outcomes = raw.map((o: any) => ({
            id: o.id,
            name: o.name || o.header, // e.g. "1-0", "2-1"
            price: Number(o.odds)
        }))
        markets['cs'] = { id: 'cs', name: 'Correct Score', outcomes }
    }

    // 6. Half Time / Full Time (HT/FT)
    if (oddsData?.main?.sp?.half_time_full_time) {
        const raw = oddsData.main.sp.half_time_full_time
        const outcomes = raw.map((o: any) => ({
            id: o.id,
            name: o.name || o.header, // e.g. "Home/Home", "Draw/Away"
            price: Number(o.odds)
        }))
        markets['htft'] = { id: 'htft', name: 'HT/FT', outcomes }
    }

    // 7. Total Goals (Exact Goals)
    // Often in 'goals.sp.alternative_total_goals' or similar. 
    // Let's check 'goals.sp.goals_over_under' implies lines.
    // Exact goals usually under 'goals.sp.exact_goals' or 'main.sp.exact_goals'? 
    // Actually BetsAPI usually puts it in 'goals' section.
    // For now, let's look for "Exact Goals" in main or goals
    if (oddsData?.goals?.sp?.exact_goals_number) {
         const raw = oddsData.goals.sp.exact_goals_number
         const outcomes = raw.map((o: any) => ({
            id: o.id,
            name: o.header, // "0", "1", "2"...
            price: Number(o.odds)
        }))
        markets['tg'] = { id: 'tg', name: 'Total Goals', outcomes }
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
        markets: markets
    }
}
