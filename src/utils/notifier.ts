
import { BOT_TOKEN } from '../config';
import { getTemplate } from './templates';

// Helper to determine the target chat ID
function getTargetChat(user: any): string | null {
    // Priority 1: If user is bound to a group (Member), send there.
    if (user.telegram_group_id) return user.telegram_group_id;
    // Priority 2: If user owns a group (Leader), send there.
    if (user.owned_group_id) return user.owned_group_id;
    return null;
}

// Helper to format mention
function getMention(user: any): string {
    if (user.telegram_username) {
        return `@${user.telegram_username}`;
    }
    return `(UID ${user.uid})`; // Fallback if no username
}

// Main Notification Function
export async function notifyAction(db: D1Database, type: string, user: any, data: any) {
    if (!user) return;

    const chatId = getTargetChat(user);
    if (!chatId) return; // No group to send to

    const mention = getMention(user);
    
    // Prepare standardized params
    const params = {
        mention: mention,
        uid: user.uid,
        ...data
    };

    // Get Template
    const msg = await getTemplate(db, type, params, user.id);
    if (!msg) return;

    // Send
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: chatId, 
                text: msg, 
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        });
    } catch (e) {
        console.error(`[Notifier] Failed to send ${type} to ${chatId}`, e);
    }
}
