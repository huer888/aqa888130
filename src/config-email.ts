import Database from 'better-sqlite3'

const db = new Database('local.sqlite')

const apiKey = 're_Nz3QeX9m_JfXL7KhbqUSGqmskRtFzcNzd'
const template = '<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;"><h2>Stake Parceiros</h2><p>Seu código de verificação é:</p><h1 style="color: #00E701; font-size: 32px; letter-spacing: 5px;">{code}</h1><p>Se você não solicitou este código, ignore este e-mail.</p></div>'

try {
    const insert = db.prepare('INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?')
    
    insert.run('resend_api_key', apiKey, apiKey)
    insert.run('email_template_register', template, template)
    
    console.log('✅ Resend API Key Configured')
    console.log('✅ Email Template Configured')
} catch (e: any) {
    console.error('❌ Configuration Failed:', e.message)
}
