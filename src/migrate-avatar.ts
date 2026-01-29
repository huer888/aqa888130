import Database from 'better-sqlite3'

const db = new Database('local.sqlite')

try {
    db.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT;`)
    console.log('✅ Avatar Column Added')
} catch (e: any) {
    console.log('⚠️ Column might already exist:', e.message)
}
