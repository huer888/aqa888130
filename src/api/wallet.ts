import { Hono } from 'hono'
import { Bindings } from '../bindings'
import { authMiddleware } from '../middleware'

const wallet = new Hono<{ Bindings: Bindings, Variables: { user: any } }>()

wallet.use('*', authMiddleware)

// --- Helper: Exchange Rate ---
const USDT_BRL_RATE = 5.85 // Default Mock Rate
const TRC20_ADDRESS = "T9yD14Nj9j7xAB4dbGeiX9h8unkce85kym" // Platform Address

async function getRate(db: D1Database): Promise<number> {
    const res = await db.prepare("SELECT rate FROM exchange_rates WHERE pair = 'USDT_BRL'").first<any>()
    if (res) return res.rate
    // Initialize if not exists
    await db.prepare("INSERT OR IGNORE INTO exchange_rates (pair, rate, updated_at) VALUES ('USDT_BRL', ?, ?)").bind(USDT_BRL_RATE, Date.now()).run()
    return USDT_BRL_RATE
}

// Get Wallet Info (Balance + User Setup + Rate)
wallet.get('/info', async (c) => {
  const userId = c.get('user').id
  // console.log(`[Wallet] Getting info for user ${userId}`)
  const user = await c.env.DB.prepare('SELECT balance, commission_balance, payment_pin, usdt_address FROM users WHERE id = ?').bind(userId).first<any>()
  const rate = await getRate(c.env.DB)
  
  if (!user) {
      console.error(`[Wallet] User ${userId} not found in DB`)
      return c.json({ error: 'User not found' }, 404)
  }

  // Double check balance type and nullability
  const safeBalance = user.balance === null ? 0 : Number(user.balance)
  
  return c.json({
      balance: safeBalance,
      commission_balance: user.commission_balance || 0,
      has_pin: !!user.payment_pin,
      usdt_address: user.usdt_address || '',
      rate: rate,
      platform_address: TRC20_ADDRESS
  })
})

// Update User Payment Settings
wallet.post('/setup', async (c) => {
    const userId = c.get('user').id
    const { pin, address } = await c.req.json()
    
    if (!pin || pin.length < 6) return c.json({ error: 'PIN must be 6 digits' }, 400)
    
    await c.env.DB.prepare('UPDATE users SET payment_pin = ?, usdt_address = ? WHERE id = ?').bind(pin, address || null, userId).run()
    return c.json({ success: true })
})

// Get Transactions
wallet.get('/transactions', async (c) => {
  const userId = c.get('user').id
  const { results } = await c.env.DB.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').bind(userId).all()
  return c.json(results)
})

// Deposit Request (Updated)
wallet.post('/deposit', async (c) => {
  const userId = c.get('user').id
  const { amount, proof_id } = await c.req.json() // Amount in BRL
  const rate = await getRate(c.env.DB)
  const usdtAmount = amount / rate
  
  try {
    const res = await c.env.DB.prepare(`
      INSERT INTO transactions (user_id, type, amount, usdt_amount, status, note, proof_image_id)
      VALUES (?, 'deposit', ?, ?, 'pending', ?, ?)
    `).bind(userId, amount, usdtAmount, `Deposit USDT-TRC20`, proof_id || null).run()
    
    return c.json({ success: true, id: res.meta.last_row_id })
  } catch (e) {
    return c.json({ error: 'Failed' }, 500)
  }
})

// Withdraw Request (Updated)
wallet.post('/withdraw', async (c) => {
  const userId = c.get('user').id
  const { amount, pin } = await c.req.json() // Amount in BRL
  const rate = await getRate(c.env.DB)
  const usdtAmount = amount / rate // Withdrawal also calculated in USDT for reference
  
  // Verify User & Balance
  const user = await c.env.DB.prepare('SELECT balance, payment_pin, usdt_address FROM users WHERE id = ?').bind(userId).first<any>()
  
  if (!user.payment_pin || user.payment_pin !== pin) {
      return c.json({ error: 'Senha de transação incorreta' }, 400)
  }
  
  if (!user.usdt_address) {
      return c.json({ error: 'Configure seu endereço USDT primeiro' }, 400)
  }
  
  if (user.balance < amount) {
    return c.json({ error: 'Saldo insuficiente' }, 400)
  }

  try {
    // Deduct balance IMMEDIATELY (Hold funds)
    await c.env.DB.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').bind(amount, userId).run()

    // Create transaction
    await c.env.DB.prepare(`
      INSERT INTO transactions (user_id, type, amount, usdt_amount, status, note, wallet_address)
      VALUES (?, 'withdraw', ?, ?, 'pending', ?, ?)
    `).bind(userId, amount, usdtAmount, `To: ${user.usdt_address}`, user.usdt_address).run()
    
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Failed' }, 500)
  }
})

export default wallet
