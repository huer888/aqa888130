import Database from 'better-sqlite3';
const db = new Database('local.sqlite');

try {
    console.log("--- USERS TABLE ---");
    const users = db.prepare("PRAGMA table_info(users)").all();
    console.log(users);
} catch (e) {
    console.log("Error reading users:", e.message);
}

try {
    console.log("--- SYSTEM_CONFIG TABLE ---");
    const config = db.prepare("PRAGMA table_info(system_config)").all();
    console.log(config);
} catch (e) {
    console.log("Error reading config:", e.message);
}
