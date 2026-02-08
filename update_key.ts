import Database from 'better-sqlite3';

const db = new Database('local.sqlite');
const key = '244533-KG7TshXWJYPVVd';

const stmt = db.prepare("UPDATE system_config SET value = ? WHERE key = 'odds_api_key'");
const info = stmt.run(key);

console.log(`Updated odds_api_key. Changes: ${info.changes}`);
