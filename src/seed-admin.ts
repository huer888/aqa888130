import Database from 'better-sqlite3'
import { hashSync } from 'bcryptjs'

const db = new Database('local.sqlite')
const password = 'admin123'
const hashedPassword = hashSync(password, 10)

const stmt = db.prepare(`
    INSERT INTO users (email, password, name, role, invite_code, uid, commission_rate, balance, kyc_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

try {
    const info = stmt.run(
        'admin@betmaster.br', 
        hashedPassword, 
        'Root Admin', 
        'admin', 
        '888888', 
        '88888888', 
        0.07, 
        10000.00,
        'verified'
    )
    console.log('✅ Admin user created!')
    console.log('📧 Email: admin@betmaster.br')
    console.log('🔑 Password: admin123')
    console.log('🎫 Invite Code: 888888')
} catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        console.log('⚠️ Admin user already exists.')
    } else {
        console.error('❌ Error creating admin:', e)
    }
}
