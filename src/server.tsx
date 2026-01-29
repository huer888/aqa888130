import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Bindings } from './bindings'

import auth from './api/auth'
import userApi from './api/user'
import wallet from './api/wallet'
import team from './api/team'
import sports from './api/sports'
import admin, { publicConfig } from './api/admin'

const app = new Hono<{ Bindings: Bindings }>()

app.onError((err, c) => {
    console.error('[CRITICAL ERROR]', err)
    return c.json({ error: 'Internal Server Error', message: err.message, stack: err.stack }, 500)
})

// Global Cache Control
app.use('*', async (c, next) => {
    await next()
    try {
      c.res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      c.res.headers.set('Pragma', 'no-cache')
      c.res.headers.set('Expires', '0')
    } catch(e) {
      // Ignore immutable headers error if response is already sent/immutable
    }
})

app.use('/api/*', cors())

// File Upload Handler (DB Storage)
app.post('/api/upload', async (c) => {
    try {
        console.log('[Upload] Starting upload...')
        const body = await c.req.parseBody()
        const file = body['file']
        const type = body['type'] as string || 'misc'
        
        console.log('[Upload] Body parsed. Type:', type)
        console.log('[Upload] File object:', typeof file, file)

        // Handle file differently depending on if it is a File object or not
        // Relaxed check: File, Blob, or object with arrayBuffer
        if (file && (file instanceof File || file instanceof Blob || (typeof file === 'object' && 'arrayBuffer' in file))) {
            const blob = file as Blob
            const buffer = await blob.arrayBuffer()
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
            const mimeType = blob.type || 'image/png' // Fallback mime type
            const dataUrl = `data:${mimeType};base64,${base64}`
            
            // Store in DB
            const user = c.get('user') as any 
            const userId = (body['userId'] as string) || null

            console.log(`[Upload] Saving to DB. UserID: ${userId}, Size: ${base64.length}`)
            const res = await c.env.DB.prepare('INSERT INTO images (user_id, type, data) VALUES (?, ?, ?)').bind(userId, type, dataUrl).run()
            
            console.log('[Upload] Saved. ID:', res.meta.last_row_id)
            return c.json({ url: `/api/image/${res.meta.last_row_id}`, id: res.meta.last_row_id })
        }
        
        console.error('[Upload] Invalid file object')
        return c.json({ error: 'No file uploaded or invalid format' }, 400)
    } catch (e: any) {
        console.error('[Upload] Error:', e)
        return c.json({ error: 'Upload failed: ' + e.message }, 500)
    }
})

// Serve Image
app.get('/api/image/:id', async (c) => {
    const id = c.req.param('id')
    const img = await c.env.DB.prepare('SELECT data FROM images WHERE id = ?').bind(id).first<any>()
    if (!img) return c.notFound()
    
    // Serve as binary
    const parts = img.data.split(',')
    const type = parts[0].split(':')[1].split(';')[0]
    const binStr = atob(parts[1])
    const len = binStr.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i)
    
    return new Response(bytes.buffer, {
        headers: { 
            'Content-Type': type,
            'Cache-Control': 'public, max-age=31536000'
        }
    })
})

app.route('/api/public-config', publicConfig)
app.route('/api/auth', auth)
app.route('/api/user', userApi)
app.route('/api/wallet', wallet)
app.route('/api/team', team)
app.route('/api/sports', sports)
app.route('/api/admin', admin)

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', version: '6.0' })
})

app.get('*', async (c) => {
  return await c.env.ASSETS.fetch(c.req.raw)
})

export default app
