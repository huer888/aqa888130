import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import path from 'path'

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

const port = parseInt(process.env.PORT || '3000')
const app = new Hono()

// --- Database Setup (Stable Local SQLite) ---
const db = new Database('local.sqlite')
db.pragma('journal_mode = WAL')
console.log('✅ Connected to Local SQLite Database (WAL Mode)')

// Start Auto-Settlement Interval (Every 5 minutes)
console.log('⏰ Starting Auto-Settlement Job...')
setInterval(() => {
    // Construct a mock environment to pass DB
    const mockEnv = {
        DB: {
            prepare: (query: string) => db.prepare(query),
            batch: async (statements: any[]) => {
                 const runTransaction = db.transaction((stmts) => {
                     for(const s of stmts) db.prepare(s.sourceSQL || s._sql).run(...(s.params || s._args || []))
                 })
                 // We need to fix the Mock Statement structure in settlement.ts to match what we use here
                 // or adapt here. The best way is to reuse the 'prepare' wrapper I defined below 
                 // but that's inside the middleware.
                 
                 // Let's rely on the middleware definition? No, we are outside request context.
                 // We need to pass a compatible DB object to autoSettleBets.
                 // Let's fix this block to properly wrap the DB for the helper function.
            }
        },
        ODDS_API_KEY: process.env.ODDS_API_KEY || "244533-KG7TshXWJYPVVd"
    } as any
    
    // We need a robust DB wrapper for the standalone function
    mockEnv.DB.prepare = (query: string) => {
        const stmt = db.prepare(query)
        return {
            _sql: query,
            bind: (...args: any[]) => ({ 
                _sql: query, 
                _args: args, 
                first: () => stmt.get(...args), 
                all: () => ({ results: stmt.all(...args) }),
                run: () => {
                    const res = stmt.run(...args);
                    return { meta: { last_row_id: res.lastInsertRowid, changes: res.changes } }
                }
            }),
            first: () => stmt.get(),
            all: () => ({ results: stmt.all() })
        }
    }
    
    mockEnv.DB.batch = async (stmts: any[]) => {
        const runTransaction = db.transaction((s_list) => {
            for(const s of s_list) {
                db.prepare(s._sql).run(...(s._args || []))
            }
        })
        runTransaction(stmts)
    }

    // Wrap in try-catch to prevent crashing main process
    try {
        // Dynamic Config Fetch
        const config = db.prepare("SELECT value FROM system_config WHERE key = 'odds_api_key'").get() as any
        if (config && config.value) {
            mockEnv.ODDS_API_KEY = config.value
            // console.log('🔄 Using Dynamic Odds API Key:', config.value)
        }

        autoSettleBets(mockEnv).catch(e => console.error('[Cron Error Settle]', e))
        updateSportsData(mockEnv).catch(e => console.error('[Cron Error Update]', e))
    } catch (e) {
        console.error('[Cron Sync Error]', e)
    }
}, 300000) // 5 minutes

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
                         const res = db.prepare(sql).run(...args)
                         results.push({ meta: { last_row_id: res.lastInsertRowid, changes: res.changes } })
                     }
                 })
                 runTransaction(statements)
                 return results
             } catch (e) {
                 console.error('[Batch Error]', e)
                 throw e
             }
        }
    },
    ODDS_API_KEY: process.env.ODDS_API_KEY || "244533-KG7TshXWJYPVVd",
    JWT_SECRET: "dev-secret-key-stable",
    VQPAY_APP_ID: "sp2017234877044363264m",
    VQPAY_SECRET_PAY: "OBA7XU8JR8CX3CSYV1OBUWGAUE0TE8CS",
    VQPAY_SECRET_SETTLE: "PHNPMM4HYBSFYBTB9EFOSDVBS1EE9GNS",
    VQPAY_API_URL: "https://api.vortaqpay.com"
  }
  await next()
})

// --- Middleware ---
app.use('*', visitMiddleware)
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

// File Upload Shim (Memory/Disk)
app.post('/api/upload', async (c) => {
    try {
        const body = await c.req.parseBody()
        const file = body['file']
        if (file instanceof File || (typeof file === 'object' && 'arrayBuffer' in file)) {
            // @ts-ignore
            const buffer = await file.arrayBuffer()
            const base64 = Buffer.from(buffer).toString('base64')
            const dataUrl = `data:image/png;base64,${base64}` // Simplification
            
            const stmt = db.prepare('INSERT INTO images (user_id, type, data) VALUES (?, ?, ?)')
            const res = stmt.run(null, 'upload', dataUrl)
            
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
    
    // Serve Base64 as image
    const parts = img.data.split(',')
    const buffer = Buffer.from(parts[1], 'base64')
    
    c.header('Content-Type', 'image/png')
    return c.body(buffer)
})


app.get('/api/health', (c) => c.json({ status: 'ok', engine: 'node-sqlite' }))

// --- Static Frontend Serving ---
app.use('/*', serveStatic({ root: './dist' }))

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
  port
})
