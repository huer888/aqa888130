import Database from 'better-sqlite3';
const db = new Database('local.sqlite');
const master = db.prepare("SELECT * FROM users WHERE invite_code = '888888'").get();
console.log('Master Account:', master);
