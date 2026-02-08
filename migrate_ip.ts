
import Database from 'better-sqlite3';
const db = new Database('local.sqlite');

try {
    console.log('Migrating IP columns...');
    db.prepare("ALTER TABLE users ADD COLUMN ip_address TEXT").run();
    console.log('Added ip_address column');
} catch (e: any) {
    if (e.message.includes('duplicate column')) {
        console.log('ip_address column already exists');
    } else {
        console.error('Error adding ip_address:', e.message);
    }
}

try {
    db.prepare("ALTER TABLE users ADD COLUMN last_login_ip TEXT").run();
    console.log('Added last_login_ip column');
} catch (e: any) {
    if (e.message.includes('duplicate column')) {
        console.log('last_login_ip column already exists');
    } else {
        console.error('Error adding last_login_ip:', e.message);
    }
}

console.log('Migration complete.');
