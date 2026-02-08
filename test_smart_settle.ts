import Database from 'better-sqlite3';
import { autoSettleBets } from './src/api/settlement';

// Mock Environment
const mockDb = new Database('local.sqlite');
const mockEnv = {
    DB: {
        prepare: (query: string) => {
            const stmt = mockDb.prepare(query)
            return {
                _sql: query,
                bind: (...args: any[]) => ({ 
                    first: () => stmt.get(...args), 
                    all: () => ({ results: stmt.all(...args) }),
                    run: () => stmt.run(...args)
                }),
                first: () => stmt.get(),
                all: () => ({ results: stmt.all() }),
                run: () => stmt.run()
            }
        },
        batch: async (stmts: any[]) => {
            const runTransaction = mockDb.transaction((s_list) => {
                for(const s of s_list) {
                    mockDb.prepare(s._sql).run(...(s._args || [])) // Need to fix _args binding in settlement first?
                    // Actually settlement.ts uses .bind() which returns an object I defined above.
                    // But settlement.ts pushes the result of .bind() into batch.
                    // My bind() returns an object with methods.
                    // I need to make sure the object pushed to batch has _sql and _args properties if settlement.ts relies on that for batching.
                    // Ah, looking at run-server.ts, the batch implementation expects objects with _sql and _args?
                    // Let's check run-server.ts implementation again.
                    // Yes: const sql = s._sql; const args = s._args || [];
                }
            })
            // Wait, my bind() above does NOT return _sql/_args properties exposed.
            // I need to fix the mockEnv below to be compatible.
        }
    },
    ODDS_API_KEY: "244533-KG7TshXWJYPVVd"
} as any

// Improve Mock DB Wrapper for Batch Compatibility
mockEnv.DB.prepare = (query: string) => {
    const stmt = mockDb.prepare(query)
    return {
        _sql: query,
        bind: (...args: any[]) => ({ 
            _sql: query,
            _args: args,
            first: () => stmt.get(...args), 
            all: () => ({ results: stmt.all(...args) }),
            run: () => {
                const res = stmt.run(...args);
                return { meta: { last_row_id: res.lastInsertRowid, changes: res.changes } }
            }
        }),
        first: () => stmt.get(),
        all: () => ({ results: stmt.all() }),
        run: () => stmt.run()
    }
}

mockEnv.DB.batch = async (stmts: any[]) => {
    const runTransaction = mockDb.transaction((s_list) => {
        for(const s of s_list) {
            // console.log('Batch Exec:', s._sql, s._args)
            mockDb.prepare(s._sql).run(...(s._args || []))
        }
    })
    runTransaction(stmts)
}

async function runTest() {
    console.log('🧪 Starting Smart Settlement Test...');

    const MATCH_ID = 'mock_match_smart';
    const USER_ID = 999;

    // 1. Setup Test User
    // Use INSERT OR IGNORE or UPDATE to handle existing user instead of DELETE (FK constraint)
    const existing = mockDb.prepare('SELECT id FROM users WHERE id = ?').get(USER_ID);
    if (!existing) {
        mockDb.prepare(`
            INSERT INTO users (id, email, password, name, balance, role) 
            VALUES (?, 'smart_test@test.com', 'pass', 'Smart Tester', 1000, 'user')
        `).run(USER_ID);
    } else {
        mockDb.prepare('UPDATE users SET balance = 1000 WHERE id = ?').run(USER_ID);
    }

    // 2. Place Bets (Direct DB Insert)
    const bets = [
        // Expected WIN (Score 2-1)
        { sel: 'Mock Home', odds: 2.0, type: '1x2' }, // Home Win
        { sel: 'Over 2.5', odds: 1.8, type: 'ou' }, // 3 goals > 2.5
        { sel: 'Yes', odds: 1.7, type: 'bts' }, // Both scored
        { sel: '2-1', odds: 8.5, type: 'cs' }, // Correct Score
        { sel: '3', odds: 3.5, type: 'tg' }, // Total goals 3

        // Expected LOSS
        { sel: 'Mock Away', odds: 3.0, type: '1x2' },
        { sel: 'Draw', odds: 3.2, type: '1x2' },
        { sel: 'Under 2.5', odds: 2.0, type: 'ou' },
        { sel: 'No', odds: 2.1, type: 'bts' },
        { sel: '1-1', odds: 6.0, type: 'cs' },
        { sel: '2', odds: 3.5, type: 'tg' },
    ];

    console.log(`📝 Placing ${bets.length} varied bets for match ${MATCH_ID} (Result: Home 2-1 Away)...`);

    mockDb.prepare('DELETE FROM bets WHERE user_id = ?').run(USER_ID);

    const insertBet = mockDb.prepare(`
        INSERT INTO bets (ticket_id, user_id, match_id, match_info, selection, odds, amount, potential_payout, status)
        VALUES (?, ?, ?, '{}', ?, ?, 100, ?, 'pending')
    `);

    bets.forEach((b, i) => {
        insertBet.run(
            `TK-TEST-${i}`, 
            USER_ID, 
            MATCH_ID, 
            b.sel, 
            b.odds, 
            100 * b.odds
        );
    });

    // 3. Run Settlement
    // We rely on the fact that I modified `betsapi.ts` to return specific result for `mock_match_smart`
    console.log('⚙️  Running Settlement Logic...');
    await autoSettleBets(mockEnv);

    // 4. Verify Results
    console.log('\n📊 Verifying Results...');
    const results = mockDb.prepare('SELECT selection, status, potential_payout FROM bets WHERE user_id = ?').all(USER_ID) as any[];
    
    let passed = 0;
    let failed = 0;

    results.forEach(r => {
        const isWin = r.status === 'won';
        const expectedWin = [
            'Mock Home', 'Over 2.5', 'Yes', '2-1', '3'
        ].includes(r.selection);

        const correct = isWin === expectedWin;
        const icon = correct ? '✅' : '❌';
        if (correct) passed++; else failed++;

        console.log(`${icon} [${r.selection}] -> Status: ${r.status} (Expected: ${expectedWin ? 'won' : 'lost'})`);
    });

    // Check Balance
    const user = mockDb.prepare('SELECT balance FROM users WHERE id = ?').get(USER_ID) as any;
    console.log(`\n💰 Final Balance: ${user.balance} (Start: 1000 - Bets: 0 (Direct Insert) + Winnings)`);
    // Winnings: 
    // Home(2.0*100=200) + Over(1.8*100=180) + Yes(1.7*100=170) + 2-1(8.5*100=850) + 3(3.5*100=350)
    // Total Win = 1750
    // Final Balance should be 1000 + 1750 = 2750
    
    if (user.balance === 2750) {
        console.log('✅ Balance Calculation Correct');
    } else {
        console.log(`❌ Balance Mismatch! Expected 2750, got ${user.balance}`);
    }

    if (failed === 0) {
        console.log('\n🏆 ALL TESTS PASSED!');
    } else {
        console.error(`\n⚠️  ${failed} TESTS FAILED`);
    }
}

runTest();
