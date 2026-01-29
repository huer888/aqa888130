// Add KYC update endpoint
import { Hono } from 'hono'
import { Bindings } from '../bindings'
import { authMiddleware } from '../middleware'

const auth = new Hono<{ Bindings: Bindings, Variables: { user: any } }>()

// ... existing auth routes

// Add this to existing auth.ts or make sure it's accessible.
// Since auth.ts is currently handling public login/register, let's add a protected route section or move to a 'user' api.
// For simplicity, I'll add a user update route in `src/api/auth.ts` but it needs auth middleware.
// Better: Add `src/api/user.ts` for user profile management.

export default auth
