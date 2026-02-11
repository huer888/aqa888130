
import Database from 'better-sqlite3';

const db = new Database('local.sqlite');

const configs = [
    // [New 11] Direct Invite (Level 1) - Message to IMMEDIATE Parent
    // "Congrats, YOU invited someone!"
    {
        key: 'tpl_invite_l1',
        value: `🔥 <b>VOCÊ RECRUTOU UM GUERREIRO!</b> 🦁

👇 <b>Sua tropa cresceu!</b>
👤 <b>Novo Soldado:</b> {source_uid}
📊 <b>Sua Equipe Total:</b> {member_total_downline} Pessoas

🚀 <i>Continue assim! Quanto mais soldados, maior a vitória!</i>`
    },
    
    // [New 12] Indirect Invite (Level 2) - Message to GRANDPARENT
    // "Congrats, YOUR DOWNLINE invited someone!"
    {
        key: 'tpl_invite_l2',
        value: `📈 <b>SUA REDE ESTÁ SE MULTIPLICANDO!</b> 🌐

👇 <b>Um liderado seu (Nível 1) acabou de recrutar!</b>
👤 <b>Quem convidou:</b> {member_uid} (Seu Direto)
👶 <b>Novo Neto (Nível 2):</b> {source_uid}

🔥 <i>Isso é o poder da duplicação! Sua renda passiva está sendo construída!</i>`
    }
];

console.log('💾 Updating Invite Notification Templates...');

const stmt = db.prepare('INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?');

for (const conf of configs) {
    stmt.run(conf.key, conf.value, conf.value);
    console.log(`✅ Updated: ${conf.key}`);
}

console.log('🎉 Template migration complete.');
