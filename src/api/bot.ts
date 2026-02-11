import { Hono } from 'hono'
import { Bindings } from '../bindings'

const bot = new Hono<{ Bindings: Bindings }>()

import { BOT_TOKEN } from '../config';

// Helper: Get Bot Token (Hardcoded)
async function getBotToken(db: D1Database): Promise<string | null> {
    return BOT_TOKEN;
}

// Helper: Send Message to Telegram
async function sendMessage(token: string, chatId: string, text: string, replyToMsgId?: number, keyboard?: any) {
    try {
        const body: any = {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        }
        if (replyToMsgId) body.reply_to_message_id = replyToMsgId
        if (keyboard) body.reply_markup = keyboard

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
    } catch (e) {
        console.error('[TG Bot] Send Error:', e)
    }
}

// 1. Webhook Endpoint (Receives updates from Telegram)
bot.post('/webhook', async (c) => {
    const token = await getBotToken(c.env.DB)
    if (!token) return c.json({ error: 'Bot not configured' }, 200) // Return 200 to stop TG retries

    const update = await c.req.json()
    
    // Handle Callbacks (Button Clicks)
    if (update.callback_query) {
        const cb = update.callback_query
        const chatId = cb.message.chat.id
        const data = cb.data
        
        let reply = ""
        if (data === 'menu_finance') {
            reply = `💰 **Regras de Fundos**\n\n` +
                    `🟢 **Depósito (PIX/USDT)**\n` +
                    `Mínimo: **R$ 10,00**\n` +
                    `Tempo: Imediato\n\n` +
                    `🔴 **Saque (PIX/USDT)**\n` +
                    `Mínimo: **R$ 10,00**\n` +
                    `Tempo: Até 30 min (Horário Comercial)`
        } else if (data === 'menu_profit') {
            reply = `🚀 **Como Lucrar?**\n\n` +
                    `1️⃣ **Comissão de Giro**: Ganhe % sobre TODAS as apostas da sua rede, ganhando ou perdendo!\n` +
                    `2️⃣ **Indicação**: Convide amigos e ganhe sobre o volume deles.\n\n` +
                    `*Ative o Bot de Grupo para ver seus ganhos em tempo real!*`
        } else if (data === 'menu_bot') {
            reply = `🤖 **Ativar Minhas Notificações**\n\n` +
                    `Quer receber seus resultados e lucros no grupo?\n\n` +
                    `1. Entre no grupo do seu líder/time.\n` +
                    `2. No site, vá em "Perfil" e gere um **Código de Vínculo**.\n` +
                    `3. No grupo, envie: \`/bind [Código]\`\n\n` +
                    `✅ Pronto! O robô vai te avisar quando você ganhar! 🤑`
        } else if (data === 'menu_account') {
            reply = `🔑 **Ajuda com Conta**\n\n` +
                    `• Esqueceu a senha? Fale com o Suporte.\n` +
                    `• Mudar PIN? Vá em "Segurança" no site.\n` +
                    `• Não compartilhe sua senha com ninguém!`
        } else if (data === 'menu_human') {
             const hour = new Date().getUTCHours() - 3
             if (hour >= 10 && hour < 18) {
                 reply = "👨‍💻 **Suporte Online**\n\nEnvie seu UID e sua dúvida agora mesmo. Um humano vai te atender."
             } else {
                 reply = "🌙 **Estamos Offline**\n\nHorário de atendimento: 10:00 - 18:00.\nDeixe sua mensagem, responderemos amanhã!"
             }
        }

        if (reply) {
            await sendMessage(token, chatId, reply)
        }
        return c.json({ status: 'ok' })
    }

    const message = update.message
    
    if (!message || !message.text) return c.json({ status: 'ok' })

    const chatId = message.chat.id
    const text = message.text.trim()
    const type = message.chat.type // 'private', 'group', 'supergroup'
    const fromId = message.from.id
    const username = message.from.username || 'User'

    // --- SCENARIO A: PRIVATE CHAT (SUPPORT) ---
    if (type === 'private') {
        
        // Main Menu Command
        if (text === '/start' || text === 'Menu') {
            await sendMessage(token, chatId, 
                `👋 **Olá, ${username}!** Bem-vindo ao Assistente Oficial.\n\n` +
                `Aqui você pode tirar dúvidas e configurar seu robô de vendas. Escolha uma opção:`,
                undefined,
                {
                    inline_keyboard: [
                        [{ text: "💰 充值与提现 (Financeiro)", callback_data: "menu_finance" }],
                        [{ text: "🚀 代理赚钱模式 (Como Lucrar)", callback_data: "menu_profit" }],
                        [{ text: "🤖 激活群战报 (Ativar Bot)", callback_data: "menu_bot" }],
                        [{ text: "🔑 账号问题 (Conta)", callback_data: "menu_account" }],
                        [{ text: "👩‍💻 联系人工 (Falar com Humano)", callback_data: "menu_human" }]
                    ]
                }
            )
            return c.json({ status: 'ok' })
        }

        // Support Mode: Forward to Admin Group? (Simplified for now: Auto-reply based on keywords)
        // Check office hours
        const hour = new Date().getUTCHours() - 3 // Brazil is UTC-3
        const isWorkHours = (hour >= 10 && hour < 18)

        if (isWorkHours) {
            await sendMessage(token, chatId, "👨‍💻 Nossos atendentes estão online! Por favor, envie seu **UID** e sua dúvida detalhada. Responderemos em instantes.")
        } else {
            await sendMessage(token, chatId, 
                `🌙 **Atendimento Offline**\n\n` +
                `Nosso horário é das 10:00 às 18:00 (Horário de Brasília).\n` +
                `Deixe sua mensagem e UID, resolveremos com prioridade amanhã! 💤`
            )
        }
    }

    // --- SCENARIO B: GROUP CHAT (BINDING) ---
    else if (type === 'group' || type === 'supergroup') {
        
        // Command: /setup [Code] (For Group OWNER/BOSS)
        if (text.startsWith('/setup')) {
            const parts = text.split(' ')
            if (parts.length !== 2) return c.json({ status: 'ok' }) // Silent fail or error msg

            const code = parts[1]
            // Verify
            const validCode = await c.env.DB.prepare("SELECT user_id FROM bind_codes WHERE code = ? AND expires_at > ?").bind(code, Date.now()).first<any>()
            if (!validCode) {
                await sendMessage(token, chatId, "❌ Código inválido ou expirado!")
                return c.json({ status: 'ok' })
            }

            // Register this user as the OWNER of this group
            await c.env.DB.prepare("UPDATE users SET owned_group_id = ? WHERE id = ?").bind(chatId, validCode.user_id).run()
            await c.env.DB.prepare("DELETE FROM bind_codes WHERE code = ?").bind(code).run()

            await sendMessage(token, chatId, "✅ **Grupo Registrado com Sucesso!**\n\nAgora seus membros podem enviar `/bind` para entrar no seu time.")
            return c.json({ status: 'ok' })
        }

        // Command: /bind [Code] (For MEMBER/DOWNLINE)
        if (text.startsWith('/bind')) {
            const parts = text.split(' ')
            if (parts.length !== 2) {
                await sendMessage(token, chatId, "❌ Use: `/bind [Código]`")
                return c.json({ status: 'ok' })
            }

            const code = parts[1]
            const validCode = await c.env.DB.prepare("SELECT user_id FROM bind_codes WHERE code = ? AND expires_at > ?").bind(code, Date.now()).first<any>()
            
            if (!validCode) {
                await sendMessage(token, chatId, "❌ Código inválido!")
                return c.json({ status: 'ok' })
            }

            const memberUserId = validCode.user_id
            
            // 1. Get Member's Upline
            const member = await c.env.DB.prepare("SELECT parent_id, uid, owned_group_id FROM users WHERE id = ?").bind(memberUserId).first<any>()
            if (!member || !member.parent_id) {
                // If member has no parent (Root agent?), maybe allow them to bind anywhere? 
                // Or reject because they are not a "Little Brother" of anyone?
                // Let's assume strict: Must bind to Parent.
                await sendMessage(token, chatId, "❌ **Erro de Vínculo**\nVocê não tem um líder para se vincular neste grupo.")
                return c.json({ status: 'ok' })
            }

            // 2. Get Group Owner's ID
            // We check if the current chat_id matches the parent's owned_group_id
            const parent = await c.env.DB.prepare("SELECT owned_group_id, telegram_username FROM users WHERE id = ?").bind(member.parent_id).first<any>()
            
            // Allow if:
            // A) Group belongs to Parent
            // B) Group belongs to Member (Self - allowing Dual Role)
            const isParentGroup = parent && String(parent.owned_group_id) === String(chatId);
            const isOwnGroup = member.owned_group_id && String(member.owned_group_id) === String(chatId);

            if (!isParentGroup && !isOwnGroup) {
                await sendMessage(token, chatId, 
                    `❌ **Grupo Incorreto!**\n\n` +
                    `Este grupo não pertence ao seu líder (${parent?.telegram_username ? '@'+parent.telegram_username : 'Desconhecido'}).\n` +
                    `Peça o link correto ao seu superior.`
                )
                return c.json({ status: 'ok' })
            }

            // 3. Success! Bind Member to this group
            await c.env.DB.prepare(`
                UPDATE users 
                SET telegram_group_id = ?, telegram_id = ?, telegram_username = ? 
                WHERE id = ?
            `).bind(chatId, fromId, username, memberUserId).run()

            await c.env.DB.prepare("DELETE FROM bind_codes WHERE code = ?").bind(code).run()

            await sendMessage(token, chatId, 
                `✅ **Bem-vindo ao Time!**\n\n` +
                `👤 **Membro**: @${username} (UID: ${member.uid})\n` +
                `👑 **Líder**: @${parent.telegram_username}\n` +
                `📊 **Status**: Sincronizado 🟢`
            )
        }
    }

    return c.json({ status: 'ok' })
})

// 2. Callback Query Handler (Button Clicks)
bot.post('/callback', async (c) => {
    // Handling button clicks logic (To be implemented if we use webhooks for callbacks)
    // Telegram sends callback_query updates separate from message updates
    // For simplicity in this single-file setup, we rely on the main webhook entry point usually.
    // NOTE: Real Telegram callbacks come to the SAME webhook URL but with a different JSON structure.
    
    // We need to check this in the main handler or merge logic. 
    // Let's keep it simple: The Menu buttons above are purely informational, 
    // we can make them URL buttons or handle callbacks in the main hook.
    
    // For now, let's assume the user types commands. 
    // If we want buttons to work, we need to handle `callback_query` in the main /webhook handler.
    return c.json({ status: 'ok' })
})

export default bot
