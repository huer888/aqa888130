
import { Hono } from 'hono';
import { Bindings } from '../bindings';
import { BOT_TOKEN, ADMIN_BOT_TOKEN, ADMIN_GROUP_ID, ADMIN_CHAT_ID } from '../config';

const bot = new Hono<{ Bindings: Bindings }>();

// Cache config for performance (Simple in-memory cache, refreshed every 60s?)
// For now, let's query DB directly. SQLite is fast.

// Helper to fetch bot config
async function getBotConfig(db: any) {
    try {
        const results = await db.prepare("SELECT key, value FROM system_config WHERE key LIKE 'bot_%' OR key = 'support_admin_group'").all();
        const config: any = {};
        
        // Handle better-sqlite3 result (Array) vs D1 (Object with results property)
        const rows = Array.isArray(results) ? results : (results.results || []);
        
        if (rows) {
            rows.forEach((row: any) => config[row.key] = row.value);
        }
        
        // Parse JSON buttons
        let buttons = [];
        try {
            buttons = config.bot_buttons ? JSON.parse(config.bot_buttons) : [];
        } catch (e) {
            console.error('Failed to parse bot buttons', e);
        }

        return {
            welcome: config.bot_welcome,
            buttons: buttons,
            adminGroup: config.support_admin_group // Fetch this from the loaded config object
        };
    } catch (e) {
        console.error('DB Config Error:', e);
        return { welcome: '', buttons: [] };
    }
}

export async function startSupportBot(db: D1Database) {
    console.log('🤖 [DEBUG] startSupportBot called');
    if (BOT_TOKEN) {
        console.log('✅ Starting Polling for Bot 1 (Support)');
        pollBot(BOT_TOKEN, db, 'support');
    }
    if (ADMIN_BOT_TOKEN) {
        console.log('✅ Starting Polling for Bot 2 (Admin)');
        pollBot(ADMIN_BOT_TOKEN, db, 'admin');
    }
}

async function pollBot(token: string, db: any, type: 'support' | 'admin') {
    let offset = 0;
    console.log(`🤖 [DEBUG] Starting loop for ${type}`);
    
    const runLoop = async () => {
        try {
            const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=10`;
            const response = await fetch(url);
            
            if (!response.ok) {
                if (response.status === 409) {
                    console.error(`❌ [DEBUG] Conflict (409) for ${type}. Another instance is running! Retrying in 10s...`);
                    await new Promise(r => setTimeout(r, 10000));
                } else {
                    console.error(`❌ [DEBUG] Fetch failed for ${type}: ${response.status}`);
                    await new Promise(r => setTimeout(r, 2000));
                }
            } else {
                const data = await response.json();
                if (data.ok && data.result.length > 0) {
                    for (const update of data.result) {
                        offset = update.update_id + 1;
                        if (update.message) {
                            if (type === 'support') {
                                await handleSupportMessage(token, update.message, db);
                            } else {
                                await handleAdminBotMessage(token, update.message);
                            }
                        }
                        // Callback Query Handler?
                        // Since we are moving to ReplyKeyboard (Text buttons), callback_query is less used
                        // BUT if we use InlineKeyboard for Welcome, we still need it.
                        // The user asked for "Set buttons text and reply".
                        // ReplyKeyboard sends TEXT messages. So we handle them in handleSupportMessage.
                        if (update.callback_query && type === 'support') {
                             await handleCallback(token, update.callback_query, db);
                        }
                    }
                }
            }
        } catch (e) {
            console.error(`❌ [DEBUG] Network Error (${type})`, e);
            await new Promise(r => setTimeout(r, 2000));
        }
        setTimeout(runLoop, 100); 
    };
    runLoop();
}

async function handleAdminBotMessage(token: string, msg: any) {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    if (text === '/id' || text === '/info') {
        await sendMessage(token, chatId, `🆔 <b>Chat ID:</b> <code>${chatId}</code>\n🤖 <b>Bot:</b> Admin Bot`);
        return;
    }

    if (text === '/start') {
        await sendMessage(token, chatId, "🤖 <b>Notificações Administrativas</b>\n\nSou o robô responsável por avisar sobre:\n✅ Depósitos\n✅ Saques\n✅ KYC\n✅ Alertas de Risco\n\n<i>Não respondo mensagens, apenas notifico.</i>");
    }
}

async function handleSupportMessage(token: string, msg: any, db: any) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const username = msg.from.username || null; // Use null if no username
    const fromId = msg.from.id;
    // Load Config from DB first to get Admin Group ID
    const config = await getBotConfig(db);
    const supportAdminId = config.adminGroup || ADMIN_GROUP_ID || ADMIN_CHAT_ID;

    // 1. Admin Reply Forwarding (Logic for the Support Group)
    if (String(chatId) === String(supportAdminId)) {
        // Debug command to check Group ID
        if (text === '/id') {
            await sendMessage(token, chatId, `🆔 <b>Group ID:</b> <code>${chatId}</code>\n⚙️ <b>Configured Admin ID:</b> <code>${supportAdminId}</code>`);
            return;
        }

        // Handle Reply to User
        if (msg.reply_to_message && msg.reply_to_message.text) {
            const match = msg.reply_to_message.text.match(/ID: (\d+)/);
            if (match && match[1]) {
                await sendMessage(token, match[1], `👨‍💻 **Suporte**: ${text}`);
                await sendMessage(token, chatId, `✅ Enviado para ${match[1]}`);
            }
            return;
        }
        
        // If in Admin Group and not a reply or /id, ignore to prevent spam/loops
        return; 
    }

    if (!text) return;

    if (text === '/id') {
        await sendMessage(token, chatId, `🆔 <b>Your ID:</b> <code>${chatId}</code>`);
        return;
    }

    const buttons = config.buttons || [];
    
    // Construct Reply Keyboard from DB config
    // We want 2 buttons per row max
    const keyboardRows = [];
    for (let i = 0; i < buttons.length; i += 2) {
        const row = [buttons[i]];
        if (buttons[i+1]) row.push(buttons[i+1]);
        // Map to Telegram format: { text: "Label" }
        keyboardRows.push(row.map(b => ({ text: b.label })));
    }

    const replyMarkup = {
        keyboard: keyboardRows,
        resize_keyboard: true,
        is_persistent: true,
        input_field_placeholder: "Escolha uma opção..."
    };

    // 2. Commands
    if (text === '/start' || text === 'Menu') {
        // ... (existing welcome logic) ...
        let welcome = config.welcome || `👋 <b>Olá, {username}!</b>`;
        welcome = welcome.replace('{username}', username);

        await sendMessage(token, chatId, welcome, replyMarkup);
        return;
    }

    // --- NEW: Stats Command ---
    if (text === '/stats' || text === '/perfil' || text === '📊 Minhas Estatísticas') {
        // 1. Find User by Telegram ID
        const user = db.prepare("SELECT id, uid, commission_rate FROM users WHERE telegram_id = ?").get(String(fromId));
        
        if (!user) {
            await sendMessage(token, chatId, "❌ <b>Conta não vinculada!</b>\nUse <code>/bind [código]</code> para ver suas estatísticas.");
            return;
        }

        // 2. Query Stats
        // A. Direct Downline Count
        const downlineCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE parent_id = ?").get(user.id).count;

        // B. Self Total Bet
        const selfBet = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'bet' AND status = 'completed'").get(user.id).total;

        // C. Self Total Commission (Auto-Rebate)
        const selfComm = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'commission' AND note = 'Instant Rebate to Balance'").get(user.id).total;

        // D. Downline Total Bet (Team Volume)
        const teamBet = db.prepare("SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t JOIN users u ON t.user_id = u.id WHERE u.parent_id = ? AND t.type = 'bet' AND t.status = 'completed'").get(user.id).total;

        // E. Team Total Commission (Override)
        const teamComm = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'commission' AND note LIKE 'Differential%'").get(user.id).total;

        // 3. Format Message
        const msg = `📊 <b>RELATÓRIO DE PERFORMANCE</b>\n\n` +
                    `👤 <b>UID:</b> <code>${user.uid}</code>\n` +
                    `📈 <b>Taxa:</b> ${(user.commission_rate * 100).toFixed(0)}%\n\n` +
                    `👥 <b>Equipe Direta:</b> ${downlineCount} membros\n` +
                    `🎰 <b>Apostas Pessoais:</b> R$ ${Number(selfBet).toFixed(2)}\n` +
                    `🎁 <b>Auto-Rebate (Cashback):</b> R$ ${Number(selfComm).toFixed(2)}\n\n` +
                    `🌍 <b>Volume da Equipe:</b> R$ ${Number(teamBet).toFixed(2)}\n` +
                    `💰 <b>Comissão de Equipe:</b> R$ ${Number(teamComm).toFixed(2)}\n\n` +
                    `🚀 <i>Continue divulgando para aumentar seus ganhos!</i>`;

        await sendMessage(token, chatId, msg);
        return;
    }

    // 3. Bind Commands (Hardcoded logic, strict)
    if (text.startsWith('/setup') || text.startsWith('/bind')) {
        await handleBindCommands(token, msg, db, text, chatId, username, fromId);
        return;
    }

    // 4. Dynamic Button Handling (Text Match)
    const matchedButton = buttons.find((b: any) => b.label === text);
    if (matchedButton) {
        await sendMessage(token, chatId, matchedButton.reply);
        return;
    }

    // 5. Default: Forward to Admin
    if (msg.chat.type === 'private') {
        const supportMsg = `📩 <b>Nova Mensagem de Suporte</b>\n\n` +
                           `👤 <b>Usuário</b>: @${username} (ID: ${fromId})\n` +
                           `💬 <b>Mensagem</b>:\n${text}`;
        
        console.log(`[Bot Support] Forwarding message from ${fromId} to Admin Group: ${supportAdminId}`);
        await sendMessage(token, supportAdminId, supportMsg);
        
        await sendMessage(token, chatId, 
            "🤖 Recebemos sua mensagem. Um atendente humano responderá em breve.",
            replyMarkup
        );
    }
}

// Reuse existing bind logic (unchanged)
async function handleBindCommands(token: string, msg: any, db: any, text: string, chatId: any, username: string, fromId: any) {
    // Enforce Username Check
    if (!username) {
        await sendMessage(token, chatId, "❌ <b>Atenção:</b> Você precisa configurar um <b>Nome de Usuário</b> (Username) no Telegram para vincular sua conta.\n\n👉 Vá em <i>Configurações > Editar Perfil > Nome de Usuário</i> e crie um.");
        return;
    }

    // Bind as Owner (Setup Group)
    if (text.startsWith('/setup')) {
        const parts = text.split(' ')
        if (parts.length !== 2) return;
        const code = parts[1]
        const validCode = db.prepare("SELECT user_id FROM bind_codes WHERE code = ? AND expires_at > ?").get(code, Date.now()) as any
        if (!validCode) { await sendMessage(token, chatId, "❌ Código inválido!"); return; }
        
        // Update ONLY owned_group_id (preserve telegram_group_id if exists)
        // Also update basic info (username, telegram_id)
        db.prepare("UPDATE users SET owned_group_id = ?, telegram_id = ?, telegram_username = ? WHERE id = ?").run(String(chatId), String(fromId), username, validCode.user_id);
        
        db.prepare("DELETE FROM bind_codes WHERE code = ?").run(code);
        await sendMessage(token, chatId, "✅ **Grupo Registrado!** 🚀\n\nAgora a tropa pode enviar `/bind [código]` para entrar no time.");
        return;
    }

    // Bind as Member (Join Upline's Group)
    if (text.startsWith('/bind')) {
        const parts = text.split(' ')
        if (parts.length !== 2) { await sendMessage(token, chatId, "❌ Use: `/bind [Código]`"); return; }
        const code = parts[1]
        const validCode = db.prepare("SELECT user_id FROM bind_codes WHERE code = ? AND expires_at > ?").get(code, Date.now()) as any
        if (!validCode) { await sendMessage(token, chatId, "❌ Código inválido!"); return; }
        
        const memberUserId = validCode.user_id;
        const member = db.prepare("SELECT parent_id, uid FROM users WHERE id = ?").get(memberUserId) as any;
        if (!member || !member.parent_id) { await sendMessage(token, chatId, "❌ Sem líder."); return; }
        
        const parent = db.prepare("SELECT owned_group_id, telegram_username FROM users WHERE id = ?").get(member.parent_id) as any;
        if (!parent || String(parent.owned_group_id) !== String(chatId)) { await sendMessage(token, chatId, `❌ **Grupo Incorreto!**\nEste código deve ser usado no grupo do seu Líder.`); return; }
        
        // Update ONLY telegram_group_id (preserve owned_group_id if exists)
        // Also update basic info
        db.prepare("UPDATE users SET telegram_group_id = ?, telegram_id = ?, telegram_username = ? WHERE id = ?").run(String(chatId), String(fromId), username, memberUserId);
        
        db.prepare("DELETE FROM bind_codes WHERE code = ?").run(code);
        await sendMessage(token, chatId, `🔥 **VINCULADO COM SUCESSO!**\n\n👤 **Membro**: @${username}\n📊 **Status**: Monitorando... 🟢`);
        return;
    }
}

// Handler for Inline Callback (If we still use them, e.g. from old messages)
async function handleCallback(token: string, callback: any, db: any) {
    const chatId = callback.message ? callback.message.chat.id : callback.chat?.id;
    const data = callback.data;
    
    // Check DB for matching reply?
    // Current design uses ReplyKeyboard (Text), so data matches Button Label.
    // If inline button used 'menu_fin', we need to map it back or just ignore.
    // For backward compatibility, let's keep hardcoded switch or try DB find
    
    const config = await getBotConfig(db);
    // Try to find by label? Inline buttons usually have short codes.
    // Let's just respond with "Please use the menu below"
    await sendMessage(token, chatId, "👇 Por favor use o menu abaixo.");
}

async function sendMessage(token: string, chatId: number | string, text: string, replyMarkup?: any) {
    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML', reply_markup: replyMarkup })
        });
    } catch(e) { console.error('TG Send Error:', e); }
}
