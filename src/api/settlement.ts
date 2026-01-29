import { Bindings } from '../bindings'

async function getConfig(db: any, key: string): Promise<string | null> {
    const res = await db.prepare('SELECT value FROM system_config WHERE key = ?').bind(key).first()
    return res ? res.value : null
}

export async function autoSettleBets(env: Bindings) {
    console.log('[Settlement] Starting auto-settlement...')
    const db = env.DB
    let apiKey = await getConfig(db, 'odds_api_key')
    if (!apiKey || apiKey.length < 10) apiKey = env.ODDS_API_KEY
    if (!apiKey) return

    // 1. Get Pending Bets
    // Group by match_id to avoid redundant API calls
    const pendingMatches = await db.prepare("SELECT DISTINCT match_id FROM bets WHERE status = 'pending'").all()
    const matchIds = pendingMatches.results.map((m: any) => m.match_id)

    if (matchIds.length === 0) {
        console.log('[Settlement] No pending bets.')
        return
    }

    console.log(`[Settlement] Found ${matchIds.length} pending matches to check.`)

    const baseUrl = 'https://api.oddspapi.io/v4'

    // 2. Fetch Results for each match
    // We limit concurrency to avoid rate limits
    for (const matchId of matchIds) {
        try {
            // Check if it's a mock ID (dev mode)
            if (matchId.startsWith('mock')) continue

            // Try to fetch single fixture details
            // Correct Endpoint for Oddspapi: /fixtures?fixtureId={id}
            const res = await fetch(`${baseUrl}/fixtures?fixtureId=${matchId}&apiKey=${apiKey}`)
            
            if (!res.ok) {
                console.error(`[Settlement] API Error ${res.status} for match ${matchId}`)
                continue
            }

            const data = await res.json()
            // API returns array of fixtures
            const fixture = Array.isArray(data) && data.length > 0 ? data[0] : null

            if (!fixture) {
                // Match not found in API (might be too old or invalid ID)
                continue
            }

            // Check if finished
            // status: 'Finished', 'FT', 'AET', 'Pen', 'Ended'
            const status = fixture.status?.toLowerCase() || ''
            if (['finished', 'ft', 'aet', 'pen', 'ended'].includes(status)) {
                
                // Extract Scores - Oddspapi structure usually:
                // scores: { home: "2", away: "1", ... } OR results inside the object
                // Based on standard schemas for this provider:
                // It might have `homeScore` / `awayScore` at root, or `livescore` object.
                
                // We try multiple paths to be safe
                let homeScore = 0
                let awayScore = 0
                
                if (fixture.homeScore !== undefined) homeScore = parseInt(fixture.homeScore)
                else if (fixture.score?.home !== undefined) homeScore = parseInt(fixture.score.home)
                
                if (fixture.awayScore !== undefined) awayScore = parseInt(fixture.awayScore)
                else if (fixture.score?.away !== undefined) awayScore = parseInt(fixture.score.away)
                
                let result = 'Draw'
                if (homeScore > awayScore) result = fixture.participant1Name // Home Team Name
                else if (awayScore > homeScore) result = fixture.participant2Name // Away Team Name
                
                console.log(`[Settlement] Match ${matchId} Finished. Score: ${homeScore}-${awayScore}. Winner: ${result}`)
                
                // Settle all bets for this match
                await settleMatch(db, matchId, result, fixture.participant1Name, fixture.participant2Name)
            } else {
                // console.log(`[Settlement] Match ${matchId} is ${fixture.status} (Not finished)`)
            }

        } catch (e) {
            console.error(`[Settlement] Error processing match ${matchId}:`, e)
        }
        
        // Rate limit delay
        await new Promise(r => setTimeout(r, 500))
    }
}

async function settleMatch(db: any, matchId: string, winner: string, homeName: string, awayName: string) {
    const bets = await db.prepare("SELECT * FROM bets WHERE match_id = ? AND status = 'pending'").bind(matchId).all()
    
    const batch = []
    
    for (const bet of bets.results) {
        let outcome = 'lost'
        // Logic:
        // If bet.selection == 'Draw' AND winner == 'Draw' -> WON
        // If bet.selection == winner (Team Name) -> WON
        // Note: bet.selection stores the Name (e.g. 'Flamengo') or 'Draw' (or 'Empate'?)
        // In Dashboard.tsx: selection: outcome.name === 'Draw' ? 'Empate' : outcome.name
        // So we need to match 'Empate' to 'Draw'
        
        const isDraw = winner === 'Draw'
        const betSelection = bet.selection
        
        if (isDraw && (betSelection === 'Draw' || betSelection === 'Empate')) {
            outcome = 'won'
        } else if (!isDraw && betSelection === winner) {
            outcome = 'won'
        }
        
        // Update Bet
        batch.push(db.prepare("UPDATE bets SET status = ?, settled_at = CURRENT_TIMESTAMP WHERE id = ?").bind(outcome, bet.id))
        
        // Payout if won
        if (outcome === 'won') {
            batch.push(db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").bind(bet.potential_payout, bet.user_id))
            batch.push(db.prepare("INSERT INTO transactions (user_id, type, amount, status, note) VALUES (?, 'payout', ?, 'completed', ?)").bind(bet.user_id, bet.potential_payout, `Win: ${homeName} vs ${awayName}`))
            
            // Notify
            // We need to look up UID for notification? 
            // We can do a subquery or separate fetch. Batch is fine.
            // Insert notification
            // We can use a subquery for target_uid: (SELECT uid FROM users WHERE id=bet.user_id)
            const notifySql = "INSERT INTO notifications (target_uid, title, message) VALUES ((SELECT uid FROM users WHERE id = ?), ?, ?)"
            batch.push(db.prepare(notifySql).bind(bet.user_id, 'Aposta Vencedora!', `Parabéns! Você ganhou R$ ${bet.potential_payout} na partida ${homeName} vs ${awayName}.`))
        }
    }
    
    if (batch.length > 0) {
        await db.batch(batch)
        console.log(`[Settlement] Settled ${bets.results.length} bets for match ${matchId}`)
    }
}
