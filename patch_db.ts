
import Database from 'better-sqlite3';

const db = new Database('local.sqlite');

function addColumn(table: string, columnDef: string) {
    try {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`).run();
        console.log(`✅ Added column: ${columnDef}`);
    } catch (e: any) {
        if (e.message.includes('duplicate column name')) {
            console.log(`ℹ️ Column already exists: ${columnDef.split(' ')[0]}`);
        } else {
            console.error(`❌ Failed to add column ${columnDef}:`, e.message);
        }
    }
}

console.log('🛠️ 开始修复数据库结构...');

// 1. 补全 users 表的 Telegram 相关字段
addColumn('users', 'telegram_group_id TEXT');
addColumn('users', 'telegram_id TEXT');
addColumn('users', 'telegram_username TEXT');
addColumn('users', 'owned_group_id TEXT');

// 2. 补全 users 表的 KYC 奖励字段
addColumn('users', 'kyc_bonus_claimed INTEGER DEFAULT 0');

// 3. 确保 manual_matches 表存在 (如果运营库是老版本可能没有)
try {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS manual_matches (
            id TEXT PRIMARY KEY,
            league_name TEXT,
            home_team TEXT,
            away_team TEXT,
            commence_time DATETIME,
            home_odds REAL,
            draw_odds REAL,
            away_odds REAL,
            status TEXT DEFAULT 'active'
        )
    `).run();
    console.log('✅ Checked/Created manual_matches table');
} catch (e) {
    console.error('❌ manual_matches table check failed:', e);
}

// 4. 确保 bind_codes 表存在
try {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS bind_codes (
            code TEXT PRIMARY KEY,
            user_id INTEGER,
            expires_at INTEGER
        )
    `).run();
    console.log('✅ Checked/Created bind_codes table');
} catch (e) {
    console.error('❌ bind_codes table check failed:', e);
}

console.log('🎉 数据库结构修复完成！');
