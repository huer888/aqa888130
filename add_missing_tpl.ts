
import Database from 'better-sqlite3';

const db = new Database('local.sqlite');

const configs = [
    {
        key: 'tpl_downline_win',
        value: `🏆 <b>EQUIPE GANHANDO!</b> 🟢

👇 <b>Um liderado acabou de forrar!</b>
👤 <b>Origem:</b> Sub-agente {uid}
💰 <b>Ganhou:</b> <b>R$ {profit}</b>
📈 <b>Odd:</b> {odds}x

🔥 <i>Plataforma pagando muito! Divulgue a prova social!</i>`
    }
];

console.log('💾 Adding missing template...');

const stmt = db.prepare('INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?');

for (const conf of configs) {
    stmt.run(conf.key, conf.value, conf.value);
    console.log(`✅ 已保存: ${conf.key}`);
}
