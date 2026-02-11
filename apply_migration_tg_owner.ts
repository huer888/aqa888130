import Database from 'better-sqlite3'

const db = new Database('local.sqlite')

try {
    console.log('Adding owned_group_id column to users...')
    try {
        db.prepare("ALTER TABLE users ADD COLUMN owned_group_id TEXT").run()
    } catch(e) {
        console.log('Column might already exist.')
    }

    console.log('✅ Migration applied successfully!')
} catch (e) {
    console.error('Migration failed:', e)
}
