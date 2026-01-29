import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import { Bindings } from './bindings'

export const authMiddleware = createMiddleware<{ Bindings: Bindings, Variables: { user: any } }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader) {
    console.error('[AuthMiddleware] Missing Authorization Header')
    return c.json({ error: 'Unauthorized: No Header' }, 401)
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
     console.error('[AuthMiddleware] Invalid Header Format:', authHeader)
     return c.json({ error: 'Unauthorized: Invalid Format' }, 401)
  }

  const token = parts[1]
  if (!token) {
     console.error('[AuthMiddleware] Empty Token')
     return c.json({ error: 'Unauthorized: No Token' }, 401)
  }

  try {
    // Check if Secret is available
    if (!c.env.JWT_SECRET) {
        console.error('[AuthMiddleware] CRITICAL: JWT_SECRET is undefined in env!')
        throw new Error('Server Configuration Error')
    }

    const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
    c.set('user', payload)
    await next()
  } catch (e: any) {
    console.error('[AuthMiddleware] Verification Failed:', e.message)
    // Don't return 401 for server config errors, return 500
    if (e.message === 'Server Configuration Error') {
        return c.json({ error: 'Internal Server Error' }, 500)
    }
    return c.json({ error: 'Unauthorized: Invalid Token' }, 401)
  }
})
