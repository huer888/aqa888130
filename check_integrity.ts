
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'local.sqlite');
const db = new Database(dbPath);

console.log('🏥 [1/5] 正在执行数据库深度体检...');

// 1. 物理完整性检查 (Integrity Check)
try {
    const integrity = db.pragma('integrity_check');
    if (integrity[0] === 'ok') {
        console.log('✅ 数据库物理文件完整 (Integrity Check Passed)');
    } else {
        console.error('❌ 数据库文件可能损坏:', integrity);
        process.exit(1);
    }
} catch (e) {
    console.error('❌ 无法执行完整性检查:', e);
}

// 2. 关键表结构检查
const requiredTables = [
    { name: 'users', cols: ['telegram_group_id', 'payment_pin', 'usdt_address', 'commission_rate', 'kyc_status'] },
    { name: 'transactions', cols: ['proof_image_id', 'usdt_amount'] },
    { name: 'bets', cols: ['match_id', 'selection', 'status'] },
    { name: 'manual_matches', cols: ['home_odds', 'status'] }, // 新表
    { name: 'bind_codes', cols: ['code', 'expires_at'] }        // 新表
];

let schemaErrors = 0;
for (const tbl of requiredTables) {
    try {
        const tableInfo = db.pragma(`table_info(${tbl.name})`);
        if (tableInfo.length === 0) {
            console.error(`❌ 缺失关键表: ${tbl.name}`);
            schemaErrors++;
            continue;
        }
        
        const existingCols = tableInfo.map((c: any) => c.name);
        const missingCols = tbl.cols.filter(c => !existingCols.includes(c));
        
        if (missingCols.length > 0) {
            console.error(`❌ 表 [${tbl.name}] 缺失字段: ${missingCols.join(', ')}`);
            schemaErrors++;
        } else {
            console.log(`✅ 表 [${tbl.name}] 结构正常`);
        }
    } catch (e) {
        console.error(`❌ 检查表 ${tbl.name} 时出错`, e);
    }
}

if (schemaErrors === 0) {
    console.log('✅ 数据库结构 (Schema) 完美匹配当前代码版本。');
} else {
    console.error(`⚠️ 发现 ${schemaErrors} 个结构问题，可能会导致部分功能报错！`);
}

// 3. 数据样本检查
const adminUser = db.prepare("SELECT email, role FROM users WHERE role='admin' LIMIT 1").get();
if (adminUser) {
    console.log(`✅ 检测到管理员账号: ${adminUser.email}`);
} else {
    console.warn('⚠️ 警告: 数据库中没有 role="admin" 的用户！您可能无法登录后台。');
}
