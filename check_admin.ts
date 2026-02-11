import Database from 'better-sqlite3';

const db = new Database('local.sqlite');
const admins = db.prepare("SELECT id, email, role, name, balance FROM users WHERE role = 'admin'").all();
console.log('Admins found:', admins);

const allUsers = db.prepare("SELECT id, email, role FROM users LIMIT 5").all();
console.log('Sample users:', allUsers);
