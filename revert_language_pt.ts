
import Database from 'better-sqlite3';

const db = new Database('local.sqlite');

const portugueseConfigs = [
    // [1] New Member
    {
        key: 'tpl_new_member',
        value: `🔥 <b>NOVO GUERREIRO NA TROPA!</b> 🦁

👇 <b>Mais um soldado se uniu ao time!</b>
🆔 <b>Novo Membro:</b> <code>{uid}</code>
{parent_info}

📈 <b>O time não para de crescer!</b>
<i>Quanto maior a equipe, maior o lucro! Continue convidando!</i> 🚀`
    },

    // [2] New Bet
    {
        key: 'tpl_bet',
        value: `🚀 <b>FOGUETE LANÇADO!</b> 🎰

👤 <b>Jogador:</b> UID {uid}
💸 <b>Entrada:</b> R$ {amount}
🎯 <b>Alvo:</b> <b>R$ {potential}</b>

📊 <b>Carreira:</b>
• Total Apostado: R$ {total_deposit} (Histórico)

🍀 <i>A sorte favorece os audazes!</i>`
    },

    // [3] Win
    {
        key: 'tpl_win',
        value: `🟢 <b>É GREEEEN! CAIXA!</b> 🤑

👤 <b>Vencedor:</b> UID {uid}
💰 <b>LUCRO:</b> <b>R$ {profit}</b>
📈 <b>Odd:</b> {odds}x

🏆 <b>Histórico de Saques:</b> R$ {total_withdraw}

🚀 <i>O método é infalível! Quem é o próximo?</i>`
    },

    // [4] Deposit
    {
        key: 'tpl_deposit',
        value: `💎 <b>RECARGA CONFIRMADA!</b> 💳

👤 <b>Membro:</b> UID {uid}
💵 <b>Valor:</b> <b>R$ {amount}</b>
🚀 <b>Status:</b> Munição Carregada!

🔥 <i>Pronto para buscar o forra! Bora pra cima!</i>`
    },

    // [5] Withdraw
    {
        key: 'tpl_withdraw',
        value: `🏦 <b>PIX NA CONTA! PAGAMENTO REALIZADO!</b> ✅

👏 <b>Beneficiário:</b> UID {uid}
💰 <b>Recebeu:</b> <b>R$ {amount}</b>
⚡ <b>Processamento:</b> Instantâneo

💸 <i>Aqui paga na hora! Monte sua equipe e lucre também!</i>`
    },

    // [6] Downline Deposit
    {
        key: 'tpl_downline_deposit',
        value: `💎 <b>PARABÉNS MEMBRO {member_uid}!</b> 👏

👇 <b>Um indicado seu acabou de recarregar!</b>
👤 <b>Indicado:</b> {source_uid}
💵 <b>Valor:</b> <b>R$ {amount}</b>

📢 <i>Viu como é fácil? Convide e ganhe comissão dormindo!</i>`
    },

    // [7] Downline Withdraw
    {
        key: 'tpl_downline_withdraw',
        value: `🏦 <b>MEMBRO {member_uid} FATURANDO!</b> 💸

👇 <b>Seu indicado está sacando lucros!</b>
👤 <b>Indicado:</b> {source_uid}
💰 <b>Saque:</b> R$ {amount}

🚀 <i>Sua rede está gerando riqueza! Parabéns!</i>`
    },

    // [8] Downline Bet
    {
        key: 'tpl_downline_bet',
        value: `🎰 <b>A MÁQUINA NÃO PARA, {member_uid}!</b> 🔄

👇 <b>Giro na sua rede!</b>
👤 <b>Origem:</b> {source_uid}
💸 <b>Volume:</b> R$ {amount}

🤝 <i>Comissão pingando na sua conta! Quem será o próximo?</i>`
    },

    // [9] Commission
    {
        key: 'tpl_commission',
        value: `💰 <b>COMISSÃO RECEBIDA!</b> 🔔

👤 <b>Parabéns Líder {member_uid}!</b>
💵 <b>Ganho Extra:</b> <b>R$ {amount}</b>
👤 <b>Fonte:</b> Diferença de Taxa (Sub {source_uid})

🛌 <i>Isso é renda passiva! Você dorme e o dinheiro cai!</i>`
    },

    // [10] Downline Win
    {
        key: 'tpl_downline_win',
        value: `🏆 <b>{member_uid} TEM UM VENCEDOR NA REDE!</b> 🟢

👇 <b>Seu indicado forrou!</b>
👤 <b>Origem:</b> {source_uid}
💰 <b>Ganhou:</b> <b>R$ {profit}</b>

🔥 <i>Plataforma pagando muito! Sua equipe está voando!</i>`
    },

    // [11] Direct Invite (Level 1)
    {
        key: 'tpl_invite_l1',
        value: `🔥 <b>VOCÊ RECRUTOU UM GUERREIRO!</b> 🦁

👇 <b>Sua tropa cresceu!</b>
👤 <b>Novo Soldado:</b> {source_uid}
📊 <b>Sua Equipe Total:</b> {member_total_downline} Pessoas

🚀 <i>Continue assim! Quanto mais soldados, maior a vitória!</i>`
    },

    // [12] Indirect Invite (Level 2)
    {
        key: 'tpl_invite_l2',
        value: `📈 <b>SUA REDE ESTÁ SE MULTIPLICANDO!</b> 🌐

👇 <b>Um liderado seu (Nível 1) acabou de recrutar!</b>
👤 <b>Quem convidou:</b> {member_uid} (Seu Direto)
👶 <b>Novo Neto (Nível 2):</b> {source_uid}

🔥 <i>Isso é o poder da duplicação! Sua renda passiva está sendo construída!</i>`
    }
];

console.log('💾 Reverting Bot Templates to Portuguese (PT-BR)...');

const stmt = db.prepare('INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?');

for (const conf of portugueseConfigs) {
    stmt.run(conf.key, conf.value, conf.value);
    console.log(`✅ Reverted: ${conf.key}`);
}

console.log('🎉 Language reversion complete.');
