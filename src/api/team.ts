import { Hono } from 'hono'
import { Bindings } from '../bindings'
import { authMiddleware } from '../middleware'

const team = new Hono<{ Bindings: Bindings, Variables: { user: any } }>()

team.use('*', authMiddleware)

// Get Team Stats Split
team.get('/stats', async (c) => {
  const userId = c.get('user').id
  
  // Direct children count
  const children = await c.env.DB.prepare('SELECT count(*) as count FROM users WHERE parent_id = ?').bind(userId).first<any>()
  
  // Self Rebate (note='Instant Rebate to Balance')
  const self = await c.env.DB.prepare("SELECT sum(amount) as total FROM transactions WHERE user_id = ? AND type = 'commission' AND note = 'Instant Rebate to Balance'").bind(userId).first<any>()

  // Override/Differential (note='Differential from sub-agent')
  const teamVal = await c.env.DB.prepare("SELECT sum(amount) as total FROM transactions WHERE user_id = ? AND type = 'commission' AND note LIKE 'Differential%'").bind(userId).first<any>()

  return c.json({
    member_count: children.count,
    self_rebate: self.total || 0,
    team_override: teamVal.total || 0,
    total_commission: (self.total || 0) + (teamVal.total || 0)
  })
})

// Get Members List
team.get('/members', async (c) => {
  const userId = c.get('user').id
  const { results } = await c.env.DB.prepare('SELECT id, email, commission_rate, created_at FROM users WHERE parent_id = ?').bind(userId).all()
  return c.json(results)
})

export default team
