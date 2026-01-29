import Database from 'better-sqlite3'
import { hashSync } from 'bcryptjs'

const db = new Database('local.sqlite')

// 1. Seed Admin
const adminEmail = 'admin@betmaster.br'
const adminPass = hashSync('admin123', 10)

try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail)
    if (!existing) {
        db.prepare(`
            INSERT INTO users (email, password, name, role, invite_code, uid, commission_rate, balance, kyc_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(adminEmail, adminPass, 'Root Admin', 'admin', '888888', '88888888', 0.07, 10000.00, 'verified')
        console.log('✅ Admin User Created')
    } else {
        console.log('ℹ️ Admin User Exists')
    }
} catch (e) { console.error('Admin Seed Error:', e) }

// 2. Seed Email Config
const apiKey = 're_Nz3QeX9m_JfXL7KhbqUSGqmskRtFzcNzd'
const template = '<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;"><h2>Stake Parceiros</h2><p>Seu código de verificação é:</p><h1 style="color: #00E701; font-size: 32px; letter-spacing: 5px;">{code}</h1><p>Se você não solicitou este código, ignore este e-mail.</p></div>'

try {
    const insert = db.prepare('INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?')
    insert.run('resend_api_key', apiKey, apiKey)
    insert.run('email_template_register', template, template)
    console.log('✅ Email Config Updated')
} catch (e) { console.error('Config Error:', e) }
