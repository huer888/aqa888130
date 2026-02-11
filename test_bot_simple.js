
const token = '8503031487:AAEk54LXHmIe6mvkSn8YPRTngmdETFnKBy8';

async function poll() {
    let offset = 0;
    console.log('Starting Simple Poll...');
    while (true) {
        try {
            console.log(`Polling offset ${offset}...`);
            const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=5`);
            const data = await res.json();
            
            if (!data.ok) {
                console.error('Error:', data);
                if (data.error_code === 409) {
                    console.error('FATAL: Conflict detected! Another instance is running.');
                    process.exit(1);
                }
            } else {
                if (data.result.length > 0) {
                    console.log('Received updates:', data.result);
                    offset = data.result[data.result.length - 1].update_id + 1;
                }
            }
        } catch (e) {
            console.error('Network error:', e);
        }
    }
}

poll();
