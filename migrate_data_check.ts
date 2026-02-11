
import Database from 'better-sqlite3';
import fs from 'fs';

const NEW_DB_PATH = '/home/user/db_import/local.sqlite';
const TARGET_PATH = '/home/user/webapp/local.sqlite';
const BACKUP_PATH = '/home/user/webapp/local.sqlite.bak';

async function migrate() {
    console.log('🔍 正在检查导入的数据库...');
    
    if (!fs.existsSync(NEW_DB_PATH)) {
        console.error('❌ 找不到新数据库文件！');
        return;
    }

    const db = new Database(NEW_DB_PATH);
    
    // 1. 验证用户数据
    try {
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
        const balanceStats = db.prepare('SELECT SUM(balance) as total FROM users').get() as any;
        console.log(`✅ 读取到用户数据: ${userCount.count} 名用户`);
        console.log(`💰 用户总余额: R$ ${balanceStats.total?.toFixed(2) || '0.00'}`);

        // 检查敏感字段是否存在
        const sampleUser = db.prepare('SELECT email, password, payment_pin, kyc_status, real_name FROM users LIMIT 1').get() as any;
        if (sampleUser) {
            console.log('🔐 敏感字段检查:');
            console.log(`   - 密码哈希: ${sampleUser.password ? '存在 ✅' : '缺失 ❌'}`);
            console.log(`   - 支付密码: ${sampleUser.payment_pin ? '存在 ✅' : '未设置 ⚪'}`);
            console.log(`   - 实名状态: ${sampleUser.kyc_status} (${sampleUser.real_name || '无姓名'})`);
        }
    } catch (e) {
        console.error('❌ 用户表读取失败:', e.message);
    }

    // 2. 验证注单数据
    try {
        const betCount = db.prepare('SELECT COUNT(*) as count FROM bets').get() as any;
        const lastBet = db.prepare('SELECT * FROM bets ORDER BY created_at DESC LIMIT 1').get() as any;
        console.log(`✅ 读取到注单记录: ${betCount.count} 条`);
        if (lastBet) {
            console.log(`   - 最新注单: ID ${lastBet.id} (金额: ${lastBet.amount})`);
        }
    } catch (e) {
        console.log('ℹ️ 注单表可能为空或不存在');
    }

    // 3. 执行替换
    console.log('\n📦 开始迁移...');
    
    // 备份当前库
    if (fs.existsSync(TARGET_PATH)) {
        fs.copyFileSync(TARGET_PATH, BACKUP_PATH);
        console.log(`✅ 旧数据库已备份至: ${BACKUP_PATH}`);
    }

    // 移动新库
    // 注意：我们要同时移动 -wal 和 -shm 文件，否则可能会数据损坏
    fs.copyFileSync(NEW_DB_PATH, TARGET_PATH);
    
    if (fs.existsSync(NEW_DB_PATH + '-wal')) {
        fs.copyFileSync(NEW_DB_PATH + '-wal', TARGET_PATH + '-wal');
    }
    if (fs.existsSync(NEW_DB_PATH + '-shm')) {
        fs.copyFileSync(NEW_DB_PATH + '-shm', TARGET_PATH + '-shm');
    }

    console.log('🚀 数据库替换完成！新数据已生效。');
}

migrate();
