import Database from 'better-sqlite3'
const db = new Database('local.sqlite')
console.log(db.pragma('table_info(users)'))
