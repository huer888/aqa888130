import Database from 'better-sqlite3'

const db = new Database('local.sqlite')

try {
    // 1. Add Telegram fields to users table
    console.log('Adding telegram columns to users...')
    try {
        db.prepare("ALTER TABLE users ADD COLUMN telegram_id TEXT").run()
    } catch(e) {} // Ignore if exists
    try {
        db.prepare("ALTER TABLE users ADD COLUMN telegram_username TEXT").run()
    } catch(e) {}
    try {
        db.prepare("ALTER TABLE users ADD COLUMN telegram_group_id TEXT").run()
    } catch(e) {}

    // 2. Create bind_codes table for secure verification
    console.log('Creating bind_codes table...')
    db.exec(`
        CREATE TABLE IF NOT EXISTS bind_codes (
            code TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)

    // 3. Add Config fields for Bot
    console.log('Adding system config keys...')
    const insertConfig = db.prepare("INSERT OR IGNORE INTO system_config (key, value) VALUES (?, ?)")
    insertConfig.run('bot_token', '') // User needs to fill this in Admin Panel
    insertConfig.run('bot_enable', '0')

    console.log('✅ Migration applied successfully!')
} catch (e) {
    console.error('Migration failed:', e)
}
