import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { compress } from 'hono/compress' // Optimization: Gzip
import { serveStatic } from '@hono/node-server/serve-static'
import Database from 'better-sqlite3'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import path from 'path'

import bot from './api/bot'

// Import API routes
import auth from './api/auth'
import userApi from './api/user'
import wallet from './api/wallet'
import team from './api/team'
import sports from './api/sports'
import admin, { publicConfig } from './api/admin'
import vqpay from './api/vqpay'
import { autoSettleBets } from './api/settlement'
import { updateSportsData } from './api/sports'
import { visitMiddleware } from './visitMiddleware'
import { startSupportBot } from './bot/support'
import { sendTgMessage } from './utils/telegram'

const port = parseInt(process.env.PORT || '3000')
const app = new Hono()

// --- Database Setup (Stable Local SQLite) ---
const db = new Database('local.sqlite')
db.pragma('journal_mode = WAL')
console.log('✅ Connected to Local SQLite Database (WAL Mode)')

// --- OPTIMIZATION 1: Ensure Indices ---
function ensureIndices() {
    console.log('🔧 Verifying Database Indices...');
    const indices = [
        "CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_bets_match ON bets(match_id)",
        "CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_users_parent ON users(parent_id)",
        "CREATE INDEX IF NOT EXISTS idx_notif_target ON notifications(target_uid)"
    ];
    indices.forEach(sql => db.prepare(sql).run());
    console.log('✅ Indices Optimized');
}
ensureIndices();

// --- OPTIMIZATION 4: Auto-Backup ---
const BACKUP_DIR = './backups';
try { mkdirSync(BACKUP_DIR, { recursive: true }); } catch(e) {}

setInterval(() => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.sqlite`);
        
        // better-sqlite3 has .backup() method
        db.backup(backupPath)
          .then(() => {
              // console.log(`📦 Database Backup created: ${backupPath}`);
          })
          .catch(err => console.error('Backup failed:', err));
          
    } catch (e) {
        console.error('Backup error:', e);
    }
}, 60 * 60 * 1000); // Every 1 hour
console.log('📦 Auto-Backup Scheduled (Hourly)');


console.log('🛑 Auto-Settlement Disabled (Manual Mode)')

// Start Bot (Running in separate process)
startSupportBot(db).catch(e => console.error('Bot Init Error:', e));

console.log('🔇 Settlement Watchdog Disabled')

// Mock Cloudflare Bindings for Hono
app.use('*', async (c, next) => {
  // Inject the DB and Config into the context
  c.env = {
    DB: {
        prepare: (query: string) => {
            const stmt = db.prepare(query)
            return {
                _sql: query,
                _args: [],
                bind: (...args: any[]) => {
                    const bound = {
                        _sql: query,
                        _args: args,
                        first: () => stmt.get(...args),
                        all: () => {
                             const res = stmt.all(...args);
                             return { results: res }
                        },
                        run: () => {
                            const res = stmt.run(...args);
                            return { success: true, meta: { last_row_id: res.lastInsertRowid, changes: res.changes } }
                        }
                    }
                    return bound
                },
                first: () => stmt.get(),
                all: () => {
                    const res = stmt.all();
                    return { results: res }
                },
                run: () => {
                    const res = stmt.run();
                    return { success: true, meta: { last_row_id: res.lastInsertRowid, changes: res.changes } }
                }
            }
        },
        batch: async (statements: any[]) => {
             try {
                 const results: any[] = []
                 const runTransaction = db.transaction((stmts) => {
                     for(const s of stmts) {
                         const sql = s._sql
                         const args = s._args || []
                         // console.log('[Batch Exec]', sql, args)
                         try {
                            const res = db.prepare(sql).run(...args)
                            results.push({ meta: { last_row_id: res.lastInsertRowid, changes: res.changes } })
                         } catch(stmtError) {
                             console.error('[Batch Statement Error]', stmtError, '\nSQL:', sql, '\nArgs:', args)
                             throw stmtError
                         }
                     }
                 })
                 runTransaction(statements)
                 return results
             } catch (e) {
                 console.error('[Batch Transaction Error]', e)
                 throw e
             }
        }
    },
    ODDS_API_KEY: process.env.ODDS_API_KEY || "244533-KG7TshXWJYPVVd",
    JWT_SECRET: process.env.JWT_SECRET || "dev-secret-key-stable",
    VQPAY_APP_ID: process.env.VQPAY_APP_ID || "sp2017234877044363264m",
    VQPAY_SECRET_PAY: process.env.VQPAY_SECRET_PAY || "OBA7XU8JR8CX3CSYV1OBUWGAUE0TE8CS",
    VQPAY_SECRET_SETTLE: process.env.VQPAY_SECRET_SETTLE || "PHNPMM4HYBSFYBTB9EFOSDVBS1EE9GNS",
    VQPAY_API_URL: "https://api.vortaqpay.com"
  }
  await next()
})

// --- Middleware ---
app.use('*', visitMiddleware)
app.use(compress()) // Optimization: Enable Gzip Compression for all routes
app.use('/*', cors())

app.use(async (c, next) => {
    console.log(`[${c.req.method}] ${c.req.url}`)
    try {
        await next()
    } catch (e) {
        console.error('Global Error Handler:', e)
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

// --- Routes ---
app.route('/api/public-config', publicConfig)
app.route('/api/auth', auth)
app.route('/api/user', userApi)
app.route('/api/wallet', wallet)
app.route('/api/team', team)
app.route('/api/sports', sports)
app.route('/api/admin', admin)
app.route('/api/vqpay', vqpay)
app.route('/api/bot', bot) // Mount Bot Webhook

// --- OPTIMIZATION 2 & 3: Optimized Image Upload (File System) ---
const UPLOAD_DIR = './public/uploads';
try { mkdirSync(UPLOAD_DIR, { recursive: true }); } catch(e) {}

app.post('/api/upload', async (c) => {
    try {
        const body = await c.req.parseBody()
        const file = body['file']
        
        if (file instanceof File || (typeof file === 'object' && 'arrayBuffer' in file)) {
            // @ts-ignore
            const buffer = await file.arrayBuffer()
            const nodeBuffer = Buffer.from(buffer)
            
            // Generate filename
            const ext = (file.name || 'image.png').split('.').pop() || 'png';
            const filename = `img_${Date.now()}_${Math.floor(Math.random()*1000)}.${ext}`;
            const filepath = path.join(UPLOAD_DIR, filename);
            
            // Save to Disk
            writeFileSync(filepath, nodeBuffer);
            
            // Store PATH in DB (prefixed with 'fs:') to distinguish from legacy base64
            const dbValue = `fs:${filename}`;
            
            const stmt = db.prepare('INSERT INTO images (user_id, type, data) VALUES (?, ?, ?)')
            const res = stmt.run(null, 'upload', dbValue)
            
            return c.json({ url: `/api/image/${res.lastInsertRowid}`, id: res.lastInsertRowid })
        }
        return c.json({ error: 'Upload failed' }, 400)
    } catch (e) {
        console.error(e)
        return c.json({ error: 'Server error' }, 500)
    }
})

app.get('/api/image/:id', (c) => {
    const id = c.req.param('id')
    const img = db.prepare('SELECT data FROM images WHERE id = ?').get(id) as any
    if(!img) return c.notFound()
    
    // Check storage type
    if (img.data.startsWith('fs:')) {
        // File System
        const filename = img.data.substring(3);
        const filepath = path.join(UPLOAD_DIR, filename);
        try {
            const buffer = readFileSync(filepath);
            // Guess mime
            let mime = 'image/png';
            if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) mime = 'image/jpeg';
            if (filename.endsWith('.svg')) mime = 'image/svg+xml';
            
            c.header('Content-Type', mime)
            c.header('Cache-Control', 'public, max-age=604800')
            return c.body(buffer)
        } catch(e) {
            return c.notFound();
        }
    } else {
        // Legacy Base64
        const parts = img.data.split(',')
        const buffer = Buffer.from(parts[1], 'base64')
        c.header('Content-Type', 'image/png')
        c.header('Cache-Control', 'public, max-age=604800') 
        return c.body(buffer)
    }
})


app.get('/api/health', (c) => c.json({ status: 'ok', engine: 'node-sqlite' }))

// --- Static Frontend Serving ---
// Optimization: Cache static assets
app.use('/*', serveStatic({ 
    root: './dist',
    onFound: (path, c) => {
        if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.png') || path.endsWith('.jpg')) {
            c.header('Cache-Control', 'public, max-age=31536000') // 1 Year cache for hashed assets
        }
    }
}))

// SPA Fallback
app.get('*', (c) => {
    try {
        const html = readFileSync('./dist/index.html')
        c.header('Content-Type', 'text/html')
        return c.body(html)
    } catch (e) {
        return c.text('UI not built. Please run "npm run build" first.', 404)
    }
})

console.log(`🚀 Server running on port ${port}`)

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0'
})
