import Database from 'better-sqlite3';
const db = new Database('local.sqlite');

try {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS manual_matches (
            id TEXT PRIMARY KEY,
            league_name TEXT,
            home_team TEXT,
            away_team TEXT,
            commence_time DATETIME,
            home_odds REAL,
            draw_odds REAL,
            away_odds REAL,
            status TEXT DEFAULT 'active'
        )
    `).run();
    console.log('Created manual_matches table');

    try {
        db.prepare("ALTER TABLE users ADD COLUMN kyc_bonus_claimed INTEGER DEFAULT 0").run();
        console.log('Added kyc_bonus_claimed column');
    } catch(e) {
        console.log('Column kyc_bonus_claimed likely exists');
    }

} catch(e) {
    console.error(e);
}
