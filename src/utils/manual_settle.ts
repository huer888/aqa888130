
export interface MatchResult {
    homeScore: number;
    awayScore: number;
    homeScoreHT?: number;
    awayScoreHT?: number;
    htFtResult?: string; // Optional manual override
}

// Normalize betting selection strings to standardized keys
// e.g. "Over 2.5" -> "o_2.5", "Manchester City" -> "1" (if home)
const normalizeSelection = (selection: string, market: string, homeTeam: string, awayTeam: string): string => {
    const s = selection.toLowerCase();
    const h = homeTeam.toLowerCase();
    const a = awayTeam.toLowerCase();

    // 1x2 / Moneyline
    if (s === h || s === '1') return '1';
    if (s === a || s === '2') return '2';
    if (s === 'draw' || s === 'x' || s === 'empate') return 'x';

    // Over/Under
    if (s.includes('over') || s.includes('mais') || s.includes('acima')) return 'over';
    if (s.includes('under') || s.includes('menos') || s.includes('abaixo')) return 'under';

    // BTS
    if (s === 'yes' || s === 'sim') return 'yes';
    if (s === 'no' || s === 'não') return 'no';

    // Double Chance (1X, X2, 12)
    if (s.includes('1x')) return '1x';
    if (s.includes('x2')) return 'x2';
    if (s.includes('12')) return '12';
    
    // HT/FT (Half Time / Full Time)
    // Common formats: 1/1, 1/X, 2/1, X/X etc.
    if (/^[1x2]\/[1x2]$/i.test(s)) return 'htft';

    // Correct Score
    // Usually formatted as "1-0", "2-1" in selection string
    return selection.trim(); // Return as is for exact match
}

export const checkOutcome = (
    betType: string, // '1x2', 'ou_2.5', 'bts', 'cs', 'dc', etc. derived from selection text if needed
    selection: string,
    homeTeam: string,
    awayTeam: string,
    result: MatchResult
): 'won' | 'lost' | 'void' => {
    const h = result.homeScore;
    const a = result.awayScore;
    const total = h + a;
    
    const hHT = result.homeScoreHT;
    const aHT = result.awayScoreHT;
    
    // Auto-detect type based on selection text if explicit type missing
    // Simple Heuristics
    const normSel = normalizeSelection(selection, '', homeTeam, awayTeam);

    // --- 1. 1x2 (Match Winner) ---
    if (normSel === '1') return h > a ? 'won' : 'lost';
    if (normSel === '2') return a > h ? 'won' : 'lost';
    if (normSel === 'x') return h === a ? 'won' : 'lost';

    // --- 2. Over/Under (Extract line) ---
    // Example: "Over 2.5", "Under 3.5"
    if (normSel === 'over' || normSel === 'under') {
        // Extract number from original string
        const match = selection.match(/(\d+(\.\d+)?)/);
        const line = match ? parseFloat(match[0]) : 2.5; // Default 2.5
        
        if (normSel === 'over') return total > line ? 'won' : 'lost';
        if (normSel === 'under') return total < line ? 'won' : 'lost';
    }

    // --- 3. Both Teams To Score ---
    if (normSel === 'yes') return (h > 0 && a > 0) ? 'won' : 'lost';
    if (normSel === 'no') return (h === 0 || a === 0) ? 'won' : 'lost';

    // --- 4. Double Chance ---
    if (normSel === '1x') return (h > a || h === a) ? 'won' : 'lost';
    if (normSel === 'x2') return (a > h || h === a) ? 'won' : 'lost';
    if (normSel === '12') return (h !== a) ? 'won' : 'lost';
    
    // --- 5. HT/FT (Half Time / Full Time) ---
    if (normSel === 'htft' || /^[1x2]\/[1x2]$/i.test(selection)) {
        // Priority: Use manual override if provided
        if (result.htFtResult) {
            return selection.toUpperCase() === result.htFtResult ? 'won' : 'lost';
        }

        if (hHT === undefined || aHT === undefined) return 'void'; // Cannot settle without HT score
        
        const htRes = hHT > aHT ? '1' : aHT > hHT ? '2' : 'x';
        const ftRes = h > a ? '1' : a > h ? '2' : 'x';
        const actualHtFt = `${htRes}/${ftRes}`.toUpperCase();
        
        const selUpper = selection.toUpperCase();
        
        // Handle "Draw" as X
        // Assuming standard format like "1/1", "1/X"
        return selUpper === actualHtFt ? 'won' : 'lost';
    }

    // --- 6. Correct Score ---
    // Check if selection matches "H-A" format
    if (/^\d+-\d+$/.test(normSel)) {
        return normSel === `${h}-${a}` ? 'won' : 'lost';
    }

    // Default: If we can't parse it, we might void it or mark lost.
    // For safety, let's look for exact string match on teams again
    if (selection === homeTeam) return h > a ? 'won' : 'lost';
    if (selection === awayTeam) return a > h ? 'won' : 'lost';

    return 'lost'; // Default fallback
}

export async function settleMatch(
    db: D1Database, 
    matchId: string, 
    result: MatchResult
): Promise<{ settled: number, payout: number }> {
    
    let settledCount = 0;
    let totalPayout = 0;

    // 1. Fetch Single Bets for this match
    // match_id is stored directly for singles
    const singleBets = await db.prepare("SELECT * FROM bets WHERE match_id = ? AND status = 'pending'").bind(matchId).all();
    
    // --- BATCH OPERATIONS ---
    const updates: any[] = [];

    // Process Singles
    for (const bet of singleBets.results as any[]) {
        let matchInfo: any = {};
        try { matchInfo = JSON.parse(bet.match_info); } catch(e) {}
        
        const home = matchInfo.home || matchInfo.home_team || 'Home';
        const away = matchInfo.away || matchInfo.away_team || 'Away';
        
        const outcome = checkOutcome('unknown', bet.selection, home, away, result);
        
        if (outcome === 'won') {
            const payout = bet.potential_payout;
            updates.push(db.prepare("UPDATE bets SET status = 'won', settled_at = CURRENT_TIMESTAMP WHERE id = ?").bind(bet.id));
            updates.push(db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").bind(payout, bet.user_id));
            updates.push(db.prepare("INSERT INTO transactions (user_id, type, amount, status, note) VALUES (?, 'payout', ?, 'completed', ?)").bind(bet.user_id, payout, `Win: ${bet.selection} (${matchInfo.home} vs ${matchInfo.away})`));
            totalPayout += payout;
        } else if (outcome === 'lost') {
            updates.push(db.prepare("UPDATE bets SET status = 'lost', settled_at = CURRENT_TIMESTAMP WHERE id = ?").bind(bet.id));
        } else {
            // Void
            updates.push(db.prepare("UPDATE bets SET status = 'void', settled_at = CURRENT_TIMESTAMP WHERE id = ?").bind(bet.id));
            updates.push(db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").bind(bet.amount, bet.user_id)); // Refund stake
        }
        settledCount++;
    }

    // 2. Fetch Pending Parlays
    // match_id is 'parlay'
    // We scan ALL pending parlays to see if they contain this matchId.
    const parlays = await db.prepare("SELECT * FROM bets WHERE match_id = 'parlay' AND status = 'pending'").all();
    
    for (const bet of parlays.results as any[]) {
        let info: any = {};
        try { info = JSON.parse(bet.match_info); } catch(e) { continue; }
        
        // info.legs = [{ matchId, selection, match: "A vs B", odds, status? }, ...]
        if (!info.legs || !Array.isArray(info.legs)) continue;

        let modified = false;
        let allWon = true;
        let anyLost = false;
        let anyVoid = false;

        // Update legs
        const newLegs = info.legs.map((leg: any) => {
            if (String(leg.matchId) === String(matchId) && (!leg.status || leg.status === 'pending')) {
                // Settle this leg
                const [home, away] = leg.match.split(' vs ');
                const legOutcome = checkOutcome('unknown', leg.selection, home.trim(), away.trim(), result);
                
                leg.status = legOutcome;
                modified = true;
            }
            
            // Check global status
            if (leg.status === 'lost') anyLost = true;
            if (leg.status !== 'won') allWon = false; // if pending or void or lost
            if (leg.status === 'void') anyVoid = true; // Handle void later (reduce odds)
            
            return leg;
        });

        if (modified) {
            // Write back updated JSON
            const newInfoStr = JSON.stringify({ ...info, legs: newLegs });
            
            if (anyLost) {
                // Parlay LOST
                updates.push(db.prepare("UPDATE bets SET status = 'lost', match_info = ?, settled_at = CURRENT_TIMESTAMP WHERE id = ?").bind(newInfoStr, bet.id));
                settledCount++;
            } else if (allWon) {
                // Parlay WON
                const payout = bet.potential_payout;
                updates.push(db.prepare("UPDATE bets SET status = 'won', match_info = ?, settled_at = CURRENT_TIMESTAMP WHERE id = ?").bind(newInfoStr, bet.id));
                updates.push(db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").bind(payout, bet.user_id));
                updates.push(db.prepare("INSERT INTO transactions (user_id, type, amount, status, note) VALUES (?, 'payout', ?, 'completed', ?)").bind(bet.user_id, payout, `Parlay Win (Ticket ${bet.ticket_id})`));
                totalPayout += payout;
                settledCount++;
            } else {
                // Still Pending (update legs only)
                updates.push(db.prepare("UPDATE bets SET match_info = ? WHERE id = ?").bind(newInfoStr, bet.id));
            }
        }
    }

    if (updates.length > 0) {
        await db.batch(updates);
    }

    return { settled: settledCount, payout: totalPayout };
}
