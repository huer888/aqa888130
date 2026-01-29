import Database from 'better-sqlite3'
const db = new Database('local.sqlite')
const tables = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()
tables.forEach((t: any) => console.log(t.sql + ';'))
