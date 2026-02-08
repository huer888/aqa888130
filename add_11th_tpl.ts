
import Database from 'better-sqlite3';

const db = new Database('local.sqlite');

const configs = [
    // [11] 下级新增成员 (Downline Recruited New Member -> Broadcast to Upline Group)
    {
        key: 'tpl_downline_new_member',
        value: `🔥 <b>MEMBRO {member_uid} EXPANDINDO!</b> 📈

👇 <b>Um liderado seu acabou de recrutar!</b>
👤 <b>Novo Soldado:</b> {source_uid}
📊 <b>Equipe do {member_uid}:</b> {member_total_downline} Pessoas

🚀 <i>O time está crescendo rápido! Não fique para trás!</i>`
    }
];

console.log('💾 Adding 11th template...');

const stmt = db.prepare('INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?');

for (const conf of configs) {
    stmt.run(conf.key, conf.value, conf.value);
    console.log(`✅ 已保存: ${conf.key}`);
}
