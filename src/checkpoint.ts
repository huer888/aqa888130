import Database from 'better-sqlite3'

const db = new Database('local.sqlite')

try {
    console.log('🔄 Checkpointing Database (Merging WAL)...')
    db.pragma('wal_checkpoint(RESTART)')
    
    console.log('🧹 Vacuuming (Compressing)...')
    db.exec('VACUUM')
    
    console.log('✅ Database Optimized and Merged.')
} catch (e: any) {
    console.error('❌ Error:', e.message)
}
