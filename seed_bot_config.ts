
import Database from 'better-sqlite3';

const db = new Database('local.sqlite');

const configs = [
    // --- 1. 私聊配置 (Private Chat) ---
    {
        key: 'bot_welcome',
        value: `👋 <b>Olá, {username}!</b> Bem-vindo ao Assistente Oficial.

Aqui você tem controle total sobre sua operação.

👇 <b>Escolha uma opção no menu abaixo:</b>`
    },
    {
        key: 'bot_buttons',
        // JSON Array
        value: JSON.stringify([
            {
                label: "💰 Depósito / Saque",
                reply: "💰 <b>Central Financeira</b>\n\n🟢 <b>Depósito (PIX/USDT)</b>\n💵 Mínimo: <b>R$ 10,00</b>\n⚡ Processamento: <b>Imediato</b>\n\n🔴 <b>Saque (PIX/USDT)</b>\n💵 Mínimo: <b>R$ 10,00</b>\n⚡ Pagamento: <b>Automático (24/7)</b>"
            },
            {
                label: "🚀 Como Lucrar (Agente)",
                reply: "🚀 <b>Plano de Carreira & Comissões</b>\n\n1️⃣ <b>Comissão de Giro (Turnover)</b>:\nReceba % sobre TODAS as apostas da sua rede, ganhando ou perdendo! O volume é o que importa. 💸\n\n2️⃣ <b>Sistema de Convite</b>:\nEnvie seu link exclusivo. O indicado fica vinculado a você PARA SEMPRE.\n\n🔥 <i>Comece a divulgar agora e construa sua renda passiva!</i>"
            },
            {
                label: "🤖 Ativar Robô no Grupo",
                reply: "🤖 <b>Tutorial: Bot de Notificações</b>\n\nQuer um robô gritando GREEN no seu grupo?\n\n1. Crie um Grupo no Telegram.\n2. Adicione este bot (@staketz_bot) como <b>Administrador</b>.\n3. No grupo, envie: <code>/setup [Seu Código de Vínculo]</code>\n4. Peça para seus membros enviarem: <code>/bind [Código Deles]</code>\n\n✅ <b>Pronto!</b> Toda a movimentação da equipe será notificada lá!"
            },
            {
                label: "🔑 Minha Conta",
                reply: "🔑 <b>Segurança da Conta</b>\n\n• <b>Senha de Login</b>: Mantenha segura.\n• <b>PIN de Saque</b>: Configure em 'Centro de Segurança' no site. É necessário para sacar.\n\n⚠️ <i>Suporte nunca pedirá sua senha.</i>"
            },
            {
                label: "🆘 Suporte Humano",
                reply: "👨‍💻 <b>Atendimento VIP</b>\n\nPrecisa de ajuda avançada? Digite sua mensagem abaixo e um de nossos gerentes entrará em contato.\n\n<i>Tempo médio de resposta: 5 minutos.</i>"
            }
        ])
    },

    // --- 2. 群聊通知模板 (Group Notifications) ---
    
    // [1] 新成员 (New Member)
    {
        key: 'tpl_new_member',
        value: `🔥 <b>NOVO GUERREIRO NA TROPA!</b> 🦁

👇 <b>Mais um soldado se uniu ao time!</b>
🆔 <b>Novo Membro:</b> <code>{uid}</code>
{parent_info}

📈 <b>O time não para de crescer!</b>
<i>Quanto maior a equipe, maior o lucro! Continue convidando!</i> 🚀`
    },

    // [2] 下注 (New Bet) - 个人展示
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

    // [3] 中奖 (Win) - 个人高光时刻
    {
        key: 'tpl_win',
        value: `🟢 <b>É GREEEEN! CAIXA!</b> 🤑

👤 <b>Vencedor:</b> UID {uid}
💰 <b>LUCRO:</b> <b>R$ {profit}</b>
📈 <b>Odd:</b> {odds}x

🏆 <b>Histórico de Saques:</b> R$ {total_withdraw}

🚀 <i>O método é infalível! Quem é o próximo?</i>`
    },

    // [4] 充值成功 (Deposit) - 增加信任
    {
        key: 'tpl_deposit',
        value: `💎 <b>RECARGA CONFIRMADA!</b> 💳

👤 <b>Membro:</b> UID {uid}
💵 <b>Valor:</b> <b>R$ {amount}</b>
🚀 <b>Status:</b> Munição Carregada!

🔥 <i>Pronto para buscar o forra! Bora pra cima!</i>`
    },

    // [5] 提现成功 (Withdraw) - 展示实力
    {
        key: 'tpl_withdraw',
        value: `🏦 <b>PIX NA CONTA! PAGAMENTO REALIZADO!</b> ✅

👏 <b>Beneficiário:</b> UID {uid}
💰 <b>Recebeu:</b> <b>R$ {amount}</b>
⚡ <b>Processamento:</b> Instantâneo

💸 <i>Aqui paga na hora! Monte sua equipe e lucre também!</i>`
    },

    // --- 3. 裂变激励类 (Downline Activity -> Upline Group) ---
    // [6] 下级充值
    {
        key: 'tpl_downline_deposit',
        value: `💎 <b>PARABÉNS MEMBRO {member_uid}!</b> 👏

👇 <b>Um indicado seu acabou de recarregar!</b>
👤 <b>Indicado:</b> {source_uid}
💵 <b>Valor:</b> <b>R$ {amount}</b>

📢 <i>Viu como é fácil? Convide e ganhe comissão dormindo!</i>`
    },

    // [7] 下级提现
    {
        key: 'tpl_downline_withdraw',
        value: `🏦 <b>MEMBRO {member_uid} FATURANDO!</b> 💸

👇 <b>Seu indicado está sacando lucros!</b>
👤 <b>Indicado:</b> {source_uid}
💰 <b>Saque:</b> R$ {amount}

🚀 <i>Sua rede está gerando riqueza! Parabéns!</i>`
    },

    // [8] 下级下注
    {
        key: 'tpl_downline_bet',
        value: `🎰 <b>A MÁQUINA NÃO PARA, {member_uid}!</b> 🔄

👇 <b>Giro na sua rede!</b>
👤 <b>Origem:</b> {source_uid}
💸 <b>Volume:</b> R$ {amount}

🤝 <i>Comissão pingando na sua conta! Quem será o próximo?</i>`
    },

    // [9] 佣金到账 (Hidden? No, this is direct commission)
    {
        key: 'tpl_commission',
        value: `💰 <b>COMISSÃO RECEBIDA!</b> 🔔

👤 <b>Parabéns Líder {member_uid}!</b>
💵 <b>Ganho Extra:</b> <b>R$ {amount}</b>
👤 <b>Fonte:</b> Diferença de Taxa (Sub {source_uid})

🛌 <i>Isso é renda passiva! Você dorme e o dinheiro cai!</i>`
    },

    // [10] 下级中奖
    {
        key: 'tpl_downline_win',
        value: `🏆 <b>{member_uid} TEM UM VENCEDOR NA REDE!</b> 🟢

👇 <b>Seu indicado forrou!</b>
👤 <b>Origem:</b> {source_uid}
💰 <b>Ganhou:</b> <b>R$ {profit}</b>

🔥 <i>Plataforma pagando muito! Sua equipe está voando!</i>`
    }
];

console.log('💾 Injetando modelos de copywriting brasileiros profissionais...');

const stmt = db.prepare('INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?');

for (const conf of configs) {
    stmt.run(conf.key, conf.value, conf.value);
    console.log(`✅ Atualizado: ${conf.key}`);
}

console.log('🎉 Tudo pronto! Sistema atualizado com sucesso.');
