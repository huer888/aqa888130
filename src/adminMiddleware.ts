import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import { Bindings } from './bindings'

export const adminMiddleware = createMiddleware<{ Bindings: Bindings, Variables: { user: any } }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader) {
    return c.json({ error: 'Unauthorized: No Header' }, 401)
  }

  const token = authHeader.split(' ')[1]
  if (!token) {
     return c.json({ error: 'Unauthorized: No Token' }, 401)
  }

  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
    
    // CRITICAL SECURITY CHECK: Enforce Role
    if (payload.role !== 'admin') {
        console.error(`[Security Alert] User ${payload.id} attempted to access Admin Area without privileges.`)
        return c.json({ error: 'Forbidden: Admin Access Only' }, 403)
    }

    c.set('user', payload)
    await next()
  } catch (e) {
    return c.json({ error: 'Unauthorized: Invalid Token' }, 401)
  }
})
