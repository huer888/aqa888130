
import Database from 'better-sqlite3';
const db = new Database('local.sqlite');

try {
    // 1. Update Users Table
    const userColumns = db.prepare("PRAGMA table_info(users)").all() as any[];
    const hasBotToken = userColumns.some(c => c.name === 'bot_token');
    
    if (!hasBotToken) {
        console.log("Adding bot columns to users table...");
        db.prepare("ALTER TABLE users ADD COLUMN telegram_id TEXT").run();
        db.prepare("ALTER TABLE users ADD COLUMN telegram_username TEXT").run();
        db.prepare("ALTER TABLE users ADD COLUMN bot_token TEXT").run();
        db.prepare("ALTER TABLE users ADD COLUMN bot_group_id TEXT").run();
        db.prepare("ALTER TABLE users ADD COLUMN bot_status TEXT DEFAULT 'off'").run();
        console.log("Users table updated.");
    } else {
        console.log("Users table already has bot columns.");
    }

    // 2. System Config (Ensure keys exist or are ready to be set)
    // We don't strictly need to alter schema for key-value store, just insert defaults if needed
    // But we'll leave it to the admin panel to set them.
    console.log("Migration complete.");

} catch (e) {
    console.error("Migration failed:", e);
}
