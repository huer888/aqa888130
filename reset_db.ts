import Database from 'better-sqlite3'
import { hashSync } from 'bcryptjs'
import fs from 'fs'

// 1. Delete existing database
const files = ['local.sqlite', 'local.sqlite-shm', 'local.sqlite-wal']
files.forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f)
})
console.log('🗑️  Old database deleted.')

// 2. Initialize new database
const db = new Database('local.sqlite')
db.pragma('journal_mode = WAL')

// 3. Create Schema
const schema = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'agent',
  parent_id INTEGER,
  commission_rate REAL DEFAULT 0.07,
  balance REAL DEFAULT 0.0,
  commission_balance REAL DEFAULT 0.0,
  kyc_status TEXT DEFAULT 'unverified',
  withdrawal_address TEXT,
  payment_pin TEXT,
  name TEXT,
  uid TEXT,
  invite_code TEXT,
  usdt_address TEXT,
  real_name TEXT,
  cpf TEXT,
  kyc_image_front TEXT,
  kyc_image_back TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  match_id TEXT NOT NULL,
  match_info TEXT NOT NULL,
  selection TEXT NOT NULL,
  odds REAL NOT NULL,
  amount REAL NOT NULL,
  potential_payout REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  settled_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'completed',
  proof_image TEXT,
  tx_hash TEXT,
  note TEXT,
  usdt_amount REAL,
  proof_image_id INTEGER,
  wallet_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_uid TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  type TEXT,
  data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sports_cache (
    key TEXT PRIMARY KEY,
    data TEXT,
    updated_at INTEGER
);

CREATE TABLE exchange_rates (
    pair TEXT PRIMARY KEY,
    rate REAL,
    updated_at INTEGER
);

CREATE TABLE verification_codes (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);
`

db.exec(schema)
console.log('✅ Schema created.')

// 4. Seed Admin
const adminPass = hashSync('Yes20080808', 10)
const insertAdmin = db.prepare(`
    INSERT INTO users (
        email, password, name, role, 
        invite_code, uid, commission_rate, balance, 
        kyc_status, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

insertAdmin.run(
    'aqa888130', 
    adminPass, 
    'Super Admin', 
    'admin', 
    '888888', 
    '88888888', 
    0.07, 
    10000.00, 
    'verified', 
    'active'
)
console.log('👤 Admin user created (aqa888130).')

// 5. Seed Configs
const insertConfig = db.prepare('INSERT INTO system_config (key, value) VALUES (?, ?)')
insertConfig.run('resend_api_key', 're_U2QiM3YJ_7uttWQoNNPmRxNzfYHBUXnPE')
insertConfig.run('odds_api_key', '504f3a87-d3e5-4d65-accd-71855e16a69d')
console.log('⚙️  System configs set.')

console.log('✨ Database reset complete!')
