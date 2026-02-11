
import { BOT_TOKEN, ADMIN_BOT_TOKEN } from './src/config';
import 'dotenv/config';

async function checkExternal() {
    console.log('\n🌐 [2/5] 正在检测外部接口联通性...');

    // 1. Check Bot 1
    try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
        const data = await res.json();
        if (data.ok) console.log(`✅ 客服机器人 (Bot 1): 在线 [ID: ${data.result.id} | @${data.result.username}]`);
        else console.error(`❌ 客服机器人异常: ${data.description}`);
    } catch(e) { console.error('❌ 无法连接 Telegram API'); }

    // 2. Check Bot 2
    try {
        const res = await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/getMe`);
        const data = await res.json();
        if (data.ok) console.log(`✅ 管理机器人 (Bot 2): 在线 [ID: ${data.result.id} | @${data.result.username}]`);
        else console.error(`❌ 管理机器人异常: ${data.description}`);
    } catch(e) { console.error('❌ 无法连接 Telegram API'); }

    // 3. Check Odds API
    const oddsKey = process.env.ODDS_API_KEY;
    console.log('⚽ 检查赛事 API Key...');
    // Mock check (真实请求会消耗配额，我们只检查格式)
    if (oddsKey && oddsKey.length > 10) {
        console.log('✅ Odds API Key 格式正确');
    } else {
        console.error('❌ Odds API Key 缺失或过短！');
    }
}

checkExternal();
