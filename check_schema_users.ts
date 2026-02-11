
import Database from 'better-sqlite3';
const db = new Database('local.sqlite');
const info = db.pragma('table_info(users)');
console.log(JSON.stringify(info, null, 2));
