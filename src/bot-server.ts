
import 'dotenv/config'
import Database from 'better-sqlite3'
import { startSupportBot } from './bot/support'

// --- Database Setup ---
const db = new Database('local.sqlite')
db.pragma('journal_mode = WAL')
console.log('✅ [Bot Server] Connected to Database')

// --- Start Bot ---
console.log('🚀 [Bot Server] Starting Bot Service...')
startSupportBot(db).catch(e => console.error('[Bot Server] Critical Error:', e));

// Keep process alive
setInterval(() => {}, 10000);
