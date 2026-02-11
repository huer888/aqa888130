import { createMiddleware } from 'hono/factory'
import { Bindings } from './bindings'

export const visitMiddleware = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  // Only count GET requests to main pages (not API, assets, or static files) to approximate "visits"
  // We exclude /api, /assets, and common static extensions
  const path = c.req.path
  if (c.req.method === 'GET' && 
      !path.startsWith('/api') && 
      !path.startsWith('/assets') &&
      !path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      
      const today = new Date().toISOString().split('T')[0]
      try {
        // We use the mocked DB wrapper injected in run-server.ts
        // The prepare().bind().run() syntax should match
        await c.env.DB.prepare(
            `INSERT INTO daily_visits (date, count) VALUES (?, 1) 
             ON CONFLICT(date) DO UPDATE SET count = count + 1`
        ).bind(today).run()
      } catch (e) {
          // Silent fail to not block request
          console.error('Visit Track Error:', e)
      }
  }
  await next()
})
