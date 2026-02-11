import Database from 'better-sqlite3';
const db = new Database('local.sqlite');
const indices = db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type = 'index'").all();
console.log('Current Indices:', indices);
