
import Database from 'better-sqlite3';

const db = new Database('local.sqlite');

const chineseConfigs = [
    // [1] 新成员 (New Member)
    {
        key: 'tpl_new_member',
        value: `🔥 <b>新战友加入团队!</b> 🦁

👇 <b>又有一位勇士加入了我们!</b>
🆔 <b>新成员:</b> <code>{uid}</code>
{parent_info}

📈 <b>团队规模持续扩大!</b>
<i>团队越大，收益越高! 继续邀请!</i> 🚀`
    },

    // [2] 下注 (New Bet)
    {
        key: 'tpl_bet',
        value: `🚀 <b>火箭发射!</b> 🎰

👤 <b>玩家:</b> UID {uid}
💸 <b>投入:</b> R$ {amount}
🎯 <b>目标:</b> <b>R$ {potential}</b>

📊 <b>生涯数据:</b>
• 总投注: R$ {total_deposit} (历史)

🍀 <i>运气眷顾勇者!</i>`
    },

    // [3] 中奖 (Win)
    {
        key: 'tpl_win',
        value: `🟢 <b>爆单啦! 收米!</b> 🤑

👤 <b>赢家:</b> UID {uid}
💰 <b>盈利:</b> <b>R$ {profit}</b>
📈 <b>赔率:</b> {odds}x

🏆 <b>提现历史:</b> R$ {total_withdraw}

🚀 <i>方法有效! 下一个是谁?</i>`
    },

    // [4] 充值成功 (Deposit)
    {
        key: 'tpl_deposit',
        value: `💎 <b>充值确认!</b> 💳

👤 <b>成员:</b> UID {uid}
💵 <b>金额:</b> <b>R$ {amount}</b>
🚀 <b>状态:</b> 弹药已填装!

🔥 <i>准备起飞! 冲冲冲!</i>`
    },

    // [5] 提现成功 (Withdraw)
    {
        key: 'tpl_withdraw',
        value: `🏦 <b>PIX到账! 付款成功!</b> ✅

👏 <b>收款人:</b> UID {uid}
💰 <b>收到:</b> <b>R$ {amount}</b>
⚡ <b>处理速度:</b> 秒到账

💸 <i>这里即时打款! 组建团队一起赚钱!</i>`
    },

    // [6] 下级充值 (Downline Deposit)
    {
        key: 'tpl_downline_deposit',
        value: `💎 <b>恭喜成员 {member_uid}!</b> 👏

👇 <b>您的一位下级刚刚充值了!</b>
👤 <b>下级:</b> {source_uid}
💵 <b>金额:</b> <b>R$ {amount}</b>

📢 <i>看到多简单了吗? 邀请就能躺赚佣金!</i>`
    },

    // [7] 下级提现 (Downline Withdraw)
    {
        key: 'tpl_downline_withdraw',
        value: `🏦 <b>成员 {member_uid} 正在赚钱!</b> 💸

👇 <b>您的下级正在提取利润!</b>
👤 <b>下级:</b> {source_uid}
💰 <b>提现:</b> R$ {amount}

🚀 <i>您的网络正在创造财富! 恭喜!</i>`
    },

    // [8] 下级下注 (Downline Bet)
    {
        key: 'tpl_downline_bet',
        value: `🎰 <b>机器不停转, {member_uid}!</b> 🔄

👇 <b>您的网络中有新投注!</b>
👤 <b>来源:</b> {source_uid}
💸 <b>流水:</b> R$ {amount}

🤝 <i>佣金正在滴入您的账户! 下一个是谁?</i>`
    },

    // [9] 佣金到账 (Commission)
    {
        key: 'tpl_commission',
        value: `💰 <b>佣金到账!</b> 🔔

👤 <b>恭喜领导人 {member_uid}!</b>
💵 <b>额外收入:</b> <b>R$ {amount}</b>
👤 <b>来源:</b> 级差佣金 (下级 {source_uid})

🛌 <i>这就是被动收入! 睡觉也能赚钱!</i>`
    },

    // [10] 下级中奖 (Downline Win)
    {
        key: 'tpl_downline_win',
        value: `🏆 <b>{member_uid} 团队有人中奖!</b> 🟢

👇 <b>您的下级爆单了!</b>
👤 <b>来源:</b> {source_uid}
💰 <b>赢得:</b> <b>R$ {profit}</b>

🔥 <i>平台赔率高! 您的团队正在起飞!</i>`
    },

    // [11] 一级拉新 (Level 1 Invite) - 通知直属上级
    {
        key: 'tpl_invite_l1',
        value: `🔥 <b>您招募了一名新战士!</b> 🦁

👇 <b>您的部队壮大了!</b>
👤 <b>新兵:</b> {source_uid}
📊 <b>您的团队总人数:</b> {member_total_downline} 人

🚀 <i>继续保持! 士兵越多, 胜利越大!</i>`
    },

    // [12] 二级拉新 (Level 2 Invite) - 通知爷爷级
    {
        key: 'tpl_invite_l2',
        value: `📈 <b>您的网络正在裂变!</b> 🌐

👇 <b>您的一名直推 (一级) 刚刚招募了新人!</b>
👤 <b>推荐人:</b> {member_uid} (您的直推)
👶 <b>新孙级 (二级):</b> {source_uid}

🔥 <i>这就是倍增的力量! 您的被动收入正在建立!</i>`
    }
];

console.log('💾 Updating Bot Templates to Chinese...');

const stmt = db.prepare('INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?');

for (const conf of chineseConfigs) {
    stmt.run(conf.key, conf.value, conf.value);
    console.log(`✅ Updated: ${conf.key}`);
}

console.log('🎉 Language update complete.');
