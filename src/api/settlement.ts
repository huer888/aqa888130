import { Bindings } from '../bindings'
import { getMatchResult } from './betsapi'

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

    // 2. Fetch Results for each match
    // We limit concurrency to avoid rate limits
    for (const matchId of matchIds) {
        try {
            // Check if it's a mock ID (dev mode) or parlay
            if (matchId.startsWith('mock') || matchId === 'parlay') continue

            const fixture = await getMatchResult(matchId, apiKey)

            if (!fixture) {
                // Match not found in API (might be too old or invalid ID)
                continue
            }

            // Check if finished (BetsAPI status '3' means Ended)
            // Or look at time_status
            const status = fixture.time_status || ''
            if (status === '3') {
                
                // Extract Scores - BetsAPI structure
                // fixture.ss (e.g., "2-1")
                // fixture.scores.2.home / away
                
                let homeScore = 0
                let awayScore = 0
                
                if (fixture.ss) {
                    const parts = fixture.ss.split('-')
                    if (parts.length === 2) {
                        homeScore = parseInt(parts[0])
                        awayScore = parseInt(parts[1])
                    }
                } else if (fixture.scores && fixture.scores['2']) {
                    homeScore = parseInt(fixture.scores['2'].home)
                    awayScore = parseInt(fixture.scores['2'].away)
                }
                
                let result = 'Draw'
                const homeName = fixture.home.name
                const awayName = fixture.away.name
                
                if (homeScore > awayScore) result = homeName
                else if (awayScore > homeScore) result = awayName
                
                console.log(`[Settlement] Match ${matchId} Finished. Score: ${homeScore}-${awayScore}. Winner: ${result}`)
                
                // Settle all bets for this match
                await settleMatch(db, matchId, result, homeName, awayName)
            } else {
                // console.log(`[Settlement] Match ${matchId} status is ${status} (Not finished)`)
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
