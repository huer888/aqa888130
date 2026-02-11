import { Hono } from 'hono'
import { Bindings } from '../bindings'
import { authMiddleware } from '../middleware'
import { sendTgMessage } from '../utils/telegram' // Import Telegram Utility

const wallet = new Hono<{ Bindings: Bindings, Variables: { user: any } }>()

wallet.use('*', authMiddleware)

// --- Helper: Exchange Rate ---
async function getRate(db: D1Database): Promise<number> {
    try {
        const res = await db.prepare("SELECT rate FROM exchange_rates WHERE pair = 'USDT_BRL'").first<any>()
        if (res && res.rate) return res.rate
    } catch (e) {
        console.error('Error fetching rate, using default')
    }
    
    // Default Mock Rate - Fallback if DB fetch fails or row missing
    const USDT_BRL_RATE = 5.85 
    
    // Initialize if not exists
    try {
        await db.prepare("INSERT OR IGNORE INTO exchange_rates (pair, rate, updated_at) VALUES ('USDT_BRL', ?, ?)").bind(USDT_BRL_RATE, Date.now()).run()
    } catch(e) {}
    
    return USDT_BRL_RATE
}

const TRC20_ADDRESS = "T9yD14Nj9j7xAB4dbGeiX9h8unkce85kym" // Platform Address

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
    const { pin } = await c.req.json()
    
    if (!pin || pin.length < 6) return c.json({ error: 'PIN must be 6 digits' }, 400)
    
    // Only update PIN, address is handled separately now
    await c.env.DB.prepare('UPDATE users SET payment_pin = ? WHERE id = ?').bind(pin, userId).run()
    return c.json({ success: true })
})

// Save Withdrawal Method
wallet.post('/methods', async (c) => {
    const userId = c.get('user').id
    const { type, value, label } = await c.req.json() // type: 'usdt' | 'pix'
    
    if (type === 'usdt') {
        await c.env.DB.prepare('UPDATE users SET usdt_address = ? WHERE id = ?').bind(value, userId).run()
    } else if (type === 'pix') {
        // Value should be JSON string: { key: '...', keyType: 'CPF' }
        // For simplicity, we just store the whole object in pix_info
        const info = JSON.stringify({ key: value, keyType: label }) 
        await c.env.DB.prepare('UPDATE users SET pix_info = ? WHERE id = ?').bind(info, userId).run()
    }
    
    return c.json({ success: true })
})

// Get Withdrawal Methods
wallet.get('/methods', async (c) => {
    const userId = c.get('user').id
    const user = await c.env.DB.prepare('SELECT usdt_address, pix_info FROM users WHERE id = ?').bind(userId).first<any>()
    
    return c.json({
        usdt: user.usdt_address,
        pix: user.pix_info ? JSON.parse(user.pix_info) : null
    })
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
    
    // User Notification: Submitted
    const uInfo = await c.env.DB.prepare("SELECT uid, email, parent_id FROM users WHERE id = ?").bind(userId).first<any>()
    if(uInfo) {
        await c.env.DB.prepare("INSERT INTO notifications (target_uid, title, message) VALUES (?, ?, ?)").bind(uInfo.uid, 'Depósito Enviado', `Seu depósito de R$ ${Number(amount).toFixed(2)} foi enviado e está em análise.`).run()
    }

    // TG Notify (Admin + Upline)
    try {
        // Admin
        await sendTgMessage(
            `💰 <b>新充值 (USDT)</b>\n\n` +
            `👤 UID: <code>${uInfo?.uid || userId}</code>\n` +
            `📧 邮箱: ${uInfo?.email}\n` +
            `💵 金额: <b>R$ ${amount.toFixed(2)}</b>\n` +
            `🔹 USDT: ${usdtAmount.toFixed(2)}`
        )

        // Upline Notification (New Deposit Pending)
        // Note: Usually we notify on approval (money received), but if requested, we can notify on submission too.
        // Given the prompt "All notifications", let's focus on Approval notifications which are already handled in admin.ts.
        // Notifying upline on "Pending" deposit might be spammy if user cancels or fails.
        // I will stick to Approval notifications in admin.ts which I already fixed.
        // So no changes needed here for Upline.
    } catch(e) {}

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
    // Deduct balance IMMEDIATELY (Atomic Update to prevent Race Condition)
    const updateRes = await c.env.DB.prepare('UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?').bind(amount, userId, amount).run()
    
    if (updateRes.meta.changes === 0) {
        return c.json({ error: 'Saldo insuficiente ou erro de concorrência' }, 400)
    }

    // Create transaction
    await c.env.DB.prepare(`
      INSERT INTO transactions (user_id, type, amount, usdt_amount, status, note, wallet_address)
      VALUES (?, 'withdraw', ?, ?, 'pending', ?, ?)
    `).bind(userId, amount, usdtAmount, `To: ${user.usdt_address}`, user.usdt_address).run()
    
    // User Notification: Submitted
    const uInfo = await c.env.DB.prepare("SELECT uid, email FROM users WHERE id = ?").bind(userId).first<any>()
    if(uInfo) {
        await c.env.DB.prepare("INSERT INTO notifications (target_uid, title, message) VALUES (?, ?, ?)").bind(uInfo.uid, 'Saque Solicitado', `Sua solicitação de saque de R$ ${Number(amount).toFixed(2)} foi recebida e está aguardando aprovação.`).run()
    }
    
    // TG Notify
    try {
        const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'Unknown IP'
        const ua = c.req.header('user-agent') || 'Unknown Device'
        const uInfo = await c.env.DB.prepare("SELECT uid, email FROM users WHERE id = ?").bind(userId).first<any>()
        await sendTgMessage(
            `💸 <b>提现申请 (WITHDRAW)</b>\n\n` +
            `👤 UID: <code>${uInfo?.uid || userId}</code>\n` +
            `📧 邮箱: ${uInfo?.email}\n` +
            `💵 金额: <b>R$ ${Number(amount).toFixed(2)}</b>\n` +
            `🔹 USDT: ${usdtAmount.toFixed(2)}\n` +
            `🏦 地址: <code>${user.usdt_address}</code>\n` +
            `🌍 IP: ${ip}\n` +
            `📱 设备: ${ua}`
        )
    } catch(e) {}

    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Failed' }, 500)
  }
})

export default wallet
