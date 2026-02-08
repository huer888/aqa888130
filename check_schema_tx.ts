
import Database from 'better-sqlite3';
const db = new Database('local.sqlite');
const info = db.pragma('table_info(transactions)');
console.log(JSON.stringify(info, null, 2));
