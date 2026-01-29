import Database from 'better-sqlite3'
import { hashSync } from 'bcryptjs'

const db = new Database('local.sqlite')
const API_URL = 'http://localhost:3038/api'

// Utils
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
let USER_TOKEN = ''
let ADMIN_TOKEN = ''
let USER_ID = 0
let TEST_EMAIL = `qa_${Date.now()}@test.com`

async function req(method: string, endpoint: string, body?: any, token?: string, isMultipart = false) {
    const headers: any = {}
    if (!isMultipart) headers['Content-Type'] = 'application/json'
    if (token) headers['Authorization'] = `Bearer ${token}`

    const opts: any = { method, headers }
    if (body) opts.body = isMultipart ? body : JSON.stringify(body)

    const res = await fetch(`${API_URL}${endpoint}`, opts)
    const data = await res.json()
    return { status: res.status, data }
}

async function runTest() {
    console.log('🧪 Starting Comprehensive Technical Assessment...\n')

    try {
        // --- 1. USER REGISTRATION FLOW ---
        console.log('🔹 [1. Registration Flow]')
        
        // 1.1 Send Code
        await req('POST', '/auth/send-code', { email: TEST_EMAIL, type: 'register' })
        
        // 1.2 Get Code from DB (Bypassing Email Service for Test Speed)
        const codeRow = db.prepare('SELECT code FROM verification_codes WHERE email = ?').get(TEST_EMAIL) as any
        if (!codeRow) throw new Error('OTP Code not found in DB')
        console.log(`   ✓ OTP Generated: ${codeRow.code}`)

        // 1.3 Register
        const regRes = await req('POST', '/auth/register', {
            email: TEST_EMAIL,
            password: 'password123',
            name: 'QA Tester',
            code: codeRow.code,
            inviteCode: '888888', // Admin's code
            rate: '0.05'
        })
        if (!regRes.data.success) throw new Error('Registration Failed')
        console.log('   ✓ User Registered')

        // 1.4 Login
        const loginRes = await req('POST', '/auth/login', { email: TEST_EMAIL, password: 'password123' })
        if (!loginRes.data.token) throw new Error('Login Failed')
        USER_TOKEN = loginRes.data.token
        USER_ID = loginRes.data.user.id
        console.log('   ✓ User Logged In (Token Acquired)')


        // --- 2. ADMIN AUTH ---
        console.log('\n🔹 [2. Admin Auth]')
        const adminRes = await req('POST', '/auth/login', { email: 'admin@betmaster.br', password: 'admin123' })
        ADMIN_TOKEN = adminRes.data.token
        console.log('   ✓ Admin Logged In')


        // --- 3. WALLET & FINANCE FLOW ---
        console.log('\n🔹 [3. Wallet & Finance Flow]')
        
        // 3.1 User Deposit
        // Mocking file upload via existing API logic requires formData, skipping actual binary upload for script simplicity
        // Instead, manually inserting file record to simulate upload
        const fileRes = db.prepare("INSERT INTO images (user_id, type, data) VALUES (?, 'deposit_proof', 'data:image/png;base64,TEST')").run(USER_ID)
        
        const depositRes = await req('POST', '/wallet/deposit', { amount: 1000, proof_id: fileRes.lastInsertRowid }, USER_TOKEN)
        const depositTxId = depositRes.data.id
        console.log(`   ✓ Deposit Requested (ID: ${depositTxId})`)

        // 3.2 Check Pending Balance (Should still be 0)
        let me = await req('GET', '/user/me', null, USER_TOKEN)
        console.log('[DEBUG] User Data:', me.data)
        if (me.data.balance !== 0) throw new Error(`Balance updated before approval! Found: ${me.data.balance}`)
        console.log('   ✓ Balance is locked (0.00)')

        // 3.3 Admin Approve
        await req('POST', `/admin/transaction/${depositTxId}/approve`, {}, ADMIN_TOKEN)
        
        // 3.4 Verify Balance Update
        me = await req('GET', '/user/me', null, USER_TOKEN)
        if (me.data.balance !== 1000) throw new Error(`Balance Mismatch: ${me.data.balance}`)
        console.log('   ✓ Deposit Approved & Balance Updated (1000.00)')


        // --- 4. BETTING SYSTEM ---
        console.log('\n🔹 [4. Betting System]')
        
        // 4.1 Get Events
        const eventsRes = await req('GET', '/sports/events', null, USER_TOKEN)
        const events = eventsRes.data
        if (!events || events.length === 0) console.warn('   ⚠️ No events found (Cache might be empty)')
        else {
            // Pick first event
            const league = events[0]
            const match = league.events[0]
            console.log(`   ✓ Found Match: ${match.home_team} vs ${match.away_team}`)

            // 4.2 Place Bet
            const betAmount = 100
            const odds = match.outcomes[0].price
            const betRes = await req('POST', '/sports/bet', {
                matchId: match.id,
                selection: match.home_team,
                odds: odds,
                amount: betAmount,
                matchInfo: { home: match.home_team, away: match.away_team, date: match.commence_time }
            }, USER_TOKEN)
            
            if (!betRes.data.success) throw new Error('Bet Placement Failed')
            console.log(`   ✓ Bet Placed: ${betAmount} on ${match.home_team} @ ${odds}`)

            // 4.3 Verify Deduct (Account for 5% commission rebate)
            // Balance = 1000 - 100 + (100 * 0.05) = 905
            me = await req('GET', '/user/me', null, USER_TOKEN)
            console.log('[DEBUG] Balance After Bet:', me.data.balance)
            const expectedAfterBet = 1000 - betAmount + (betAmount * 0.05)
            if (me.data.balance !== expectedAfterBet) throw new Error(`Balance not deducted correctly. Expected ${expectedAfterBet}, got ${me.data.balance}`)
            console.log(`   ✓ Balance Deducted (with rebate): ${me.data.balance}`)

            // 4.4 Admin Settle (Win)
            const betIdRow = db.prepare('SELECT id FROM bets WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(USER_ID) as any
            await req('POST', `/admin/bet/${betIdRow.id}/settle`, { outcome: 'won' }, ADMIN_TOKEN)
            
            // 4.5 Verify Payout
            const expectedBalance = expectedAfterBet + (betAmount * odds)
            me = await req('GET', '/user/me', null, USER_TOKEN)
            // Use approximate check for floating point
            if (Math.abs(me.data.balance - expectedBalance) > 0.01) throw new Error(`Payout Failed. Got ${me.data.balance}, Expected ${expectedBalance}`)
            console.log(`   ✓ Bet Settled (Won) & Payout Received. Balance: ${me.data.balance}`)
        }


        // --- 5. WITHDRAWAL & REJECTION ---
        console.log('\n🔹 [5. Withdrawal & Security]')
        
        // 5.1 Setup PIN & Address
        await req('POST', '/wallet/setup', { pin: '654321', address: 'TRC20TEST' }, USER_TOKEN)
        
        // 5.2 Request Withdraw
        const withdrawRes = await req('POST', '/wallet/withdraw', { amount: 200, pin: '654321' }, USER_TOKEN)
        if (!withdrawRes.data.success) throw new Error('Withdraw Request Failed')
        
        // Check Balance Deduction
        me = await req('GET', '/user/me', null, USER_TOKEN)
        const balanceAfterWithdraw = me.data.balance
        console.log(`   ✓ Withdraw Requested. Balance deducted to: ${balanceAfterWithdraw}`)

        // 5.3 Admin Reject (New Logic: No Reason required)
        const txRow = db.prepare("SELECT id FROM transactions WHERE user_id = ? AND type = 'withdraw' ORDER BY id DESC LIMIT 1").get(USER_ID) as any
        await req('POST', `/admin/transaction/${txRow.id}/reject`, { reason: 'Test Reject' }, ADMIN_TOKEN)
        
        // 5.4 Verify Refund
        me = await req('GET', '/user/me', null, USER_TOKEN)
        if (Math.abs(me.data.balance - (balanceAfterWithdraw + 200)) > 0.01) throw new Error('Refund failed on rejection')
        console.log('   ✓ Withdrawal Rejected & Funds Refunded')


        // --- 6. ADMIN USER CONTROLS ---
        console.log('\n🔹 [6. Admin User Controls]')
        
        // 6.1 Toggle Status
        const freezeRes = await req('POST', `/admin/user/${USER_ID}/toggle-status`, {}, ADMIN_TOKEN)
        if (freezeRes.data.status !== 'frozen') throw new Error('Freeze Failed')
        console.log('   ✓ User Frozen')

        // 6.2 Check Login Block
        const blockedLogin = await req('POST', '/auth/login', { email: TEST_EMAIL, password: 'password123' })
        if (blockedLogin.status !== 403) throw new Error('Frozen user can still login!')
        console.log('   ✓ Login Blocked correctly')

        // 6.3 Unfreeze
        await req('POST', `/admin/user/${USER_ID}/toggle-status`, {}, ADMIN_TOKEN)
        console.log('   ✓ User Unfrozen')

        console.log('\n✅✅✅ ALL SYSTEMS OPERATIONAL ✅✅✅')

    } catch (e: any) {
        console.error('\n❌ TEST FAILED:', e.message)
        if(e.response) console.error(e.response)
    }
}

runTest()
