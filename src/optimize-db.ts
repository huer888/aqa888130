import Database from 'better-sqlite3'

const db = new Database('local.sqlite')

try {
    console.log('⚡ Optimizing Database...')
    
    // Index for Admin Finance Tab (Filtering by type)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_tx_type_status ON transactions(type, status);`)
    console.log('✅ Index idx_tx_type_status created')

    // Index for Admin Search (Filtering by user_id) - user_id is foreign key, usually auto-indexed but explicit is safe
    db.exec(`CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, created_at);`)
    console.log('✅ Index idx_tx_user_date created')

    // Index for User Search (uid/email)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_users_search ON users(uid, email);`)
    console.log('✅ Index idx_users_search created')

    console.log('🚀 Optimization Complete')
} catch (e: any) {
    console.log('⚠️ Optimization Warning:', e.message)
}
