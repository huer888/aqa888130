
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'local.sqlite');
const db = new Database(dbPath);

try {
    const row = db.prepare("SELECT key, updated_at, length(data) as len FROM sports_cache WHERE key = 'all_events'").get();
    console.log('Current Cache Status:', row);

    if (row) {
        console.log('Deleting stale/dummy cache...');
        db.prepare("DELETE FROM sports_cache WHERE key = 'all_events'").run();
        console.log('Cache cleared successfully.');
    } else {
        console.log('No cache found (already clear).');
    }
} catch (err) {
    console.error('Error accessing DB:', err);
}
