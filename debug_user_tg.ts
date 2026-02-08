
import Database from 'better-sqlite3';
const db = new Database('local.sqlite');

const user = db.prepare("SELECT email, telegram_group_id, telegram_username, owned_group_id FROM users WHERE email LIKE '%1@1%'").get();
console.log('User 1@1:', user);
