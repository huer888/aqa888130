import fetch from 'node-fetch'
import { ADMIN_BOT_TOKEN, ADMIN_CHAT_ID } from '../config'

export const sendTgMessage = async (message: string) => {
    if (!ADMIN_BOT_TOKEN || !ADMIN_CHAT_ID) {
        console.warn('[Telegram] Admin Bot Token or Chat ID missing')
        return;
    }
    try {
        const url = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: ADMIN_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });
    } catch (e) {
        console.error('[Telegram] Error sending message:', e)
    }
}
