import Database from 'better-sqlite3'

const db = new Database('local.sqlite')

try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS verification_codes (
            email TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            expires_at INTEGER NOT NULL
        );
    `)
    console.log('✅ Verification Codes Table Created')
} catch (e: any) {
    console.log('⚠️ Error creating table:', e.message)
}
