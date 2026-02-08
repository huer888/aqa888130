
import { BOT_TOKEN } from '../config';
import { getTemplate } from './templates';

// Helper to determine the target chat IDs
// Returns unique list of chat IDs to send to (Bound Group + Owned Group)
function getTargetChats(user: any): string[] {
    const targets = new Set<string>();

    // 1. Bound Group (Parent's Group where User is a Member)
    // "My Boss needs to know I'm active"
    if (user.telegram_group_id) {
        targets.add(String(user.telegram_group_id));
    }

    // 2. Owned Group (User's Own Group where User is the Boss)
    // "My Team needs to see I'm active/earning"
    if (user.owned_group_id) {
        targets.add(String(user.owned_group_id));
    }

    return Array.from(targets);
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

    // Get ALL targets (Dual notification: Boss's Group + My Group)
    const chatIds = getTargetChats(user);
    
    if (chatIds.length === 0) return; // No group to send to

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

    // Send to ALL targets in parallel
    await Promise.all(chatIds.map(async (chatId) => {
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
    }));
}
