import Database from 'better-sqlite3'

const db = new Database('local.sqlite')

try {
    db.exec(`ALTER TABLE users ADD COLUMN real_name TEXT;`)
    db.exec(`ALTER TABLE users ADD COLUMN cpf TEXT;`)
    db.exec(`ALTER TABLE users ADD COLUMN kyc_image_front TEXT;`)
    db.exec(`ALTER TABLE users ADD COLUMN kyc_image_back TEXT;`)
    console.log('✅ KYC Columns Added')
} catch (e: any) {
    console.log('⚠️ Columns might already exist:', e.message)
}
