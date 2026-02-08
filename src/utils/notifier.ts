
import { BOT_TOKEN } from '../config';
import { getTemplate } from './templates';

// Helper to determine the target chat ID based on notification type
function getTargetChat(user: any, type: string): string | null {
    // List of notification types that are "Leadership/Team" related
    // These should go to the group the user OWNS (to motivate their own downline)
    const leaderTypes = [
        'tpl_downline_deposit', 
        'tpl_downline_withdraw', 
        'tpl_downline_bet', 
        'tpl_downline_win', 
        'tpl_commission', 
        'tpl_invite_l1',
        'tpl_team_bonus'
    ];

    const isLeaderType = leaderTypes.includes(type);

    if (isLeaderType) {
        // For leadership events, prefer the OWNED group first.
        if (user.owned_group_id) return user.owned_group_id;
        // Fallback: If they don't own a group, maybe they want to show off in their Parent's group?
        // Or maybe silent? Let's fallback to bound group for "Social Proof" in the parent group.
        if (user.telegram_group_id) return user.telegram_group_id;
    } else {
        // For personal actions (My Bet, My Deposit), prefer the BOUND group (Parent's group).
        if (user.telegram_group_id) return user.telegram_group_id;
        // Fallback: If not bound (e.g. Top Admin), post in own group.
        if (user.owned_group_id) return user.owned_group_id;
    }

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

    const chatId = getTargetChat(user, type);
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
