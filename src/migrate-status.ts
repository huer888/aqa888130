import Database from 'better-sqlite3'

const db = new Database('local.sqlite')

try {
    db.exec(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';`) // 'active', 'frozen'
    console.log('✅ User Status Column Added')
} catch (e: any) {
    console.log('⚠️ Column might already exist:', e.message)
}
