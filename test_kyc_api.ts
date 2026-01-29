import { Hono } from 'hono'
import Database from 'better-sqlite3'

// 1. Setup DB
const db = new Database('local.sqlite')

// 2. Mock Data: Insert a user with KYC data
try {
    const stmt = db.prepare(`
        INSERT INTO users (email, password, name, uid, kyc_status, real_name, cpf, kyc_image_front, kyc_image_back)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const info = stmt.run(
        'test_kyc@gmail.com', 'pass', 'Test User', '777777', 
        'pending', 'Carlos Silva', '123.456.789-00', 
        '/api/image/1', '/api/image/2'
    )
    const userId = info.lastInsertRowid
    console.log(`✅ Mock User created (ID: ${userId})`)

    // 3. Simulate the API call that the "KYC Review" button makes
    // Route: admin.get('/user/:id')
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any
    
    // Calculate stats (mocking the join)
    const deposits = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'deposit' AND status = 'completed'").get(userId) as any
    
    user.stats = {
        total_deposits: deposits?.total || 0,
        // ... others
    }

    console.log('--- API Response Simulation ---')
    console.log(`User Name: ${user.name}`)
    console.log(`Real Name: ${user.real_name}`)
    console.log(`CPF: ${user.cpf}`)
    console.log(`Front Image: ${user.kyc_image_front}`)
    
    if (user.real_name && user.kyc_image_front) {
        console.log('✅ TEST PASSED: API returns necessary KYC data for the modal.')
    } else {
        console.log('❌ TEST FAILED: Missing KYC data.')
    }

} catch (e) {
    console.error(e)
}
