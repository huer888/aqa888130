import Database from 'better-sqlite3';
const db = new Database('local.sqlite');

try {
    console.log('Adding bonus columns...');
    db.prepare("ALTER TABLE users ADD COLUMN bonus REAL DEFAULT 0").run();
    db.prepare("ALTER TABLE users ADD COLUMN kyc_bonus_claimed INTEGER DEFAULT 0").run();
    console.log('✅ Columns added successfully.');
} catch (e: any) {
    if (e.message.includes('duplicate column')) {
        console.log('⚠️ Columns already exist, skipping.');
    } else {
        console.error('❌ Error adding columns:', e);
    }
}
