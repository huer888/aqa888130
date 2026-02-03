import { Hono } from 'hono'
import { Bindings } from '../bindings'
import { authMiddleware } from '../middleware'
import { hash } from 'bcryptjs'

const admin = new Hono<{ Bindings: Bindings, Variables: { user: any } }>()

// Public Config (No Auth required for Deposit Address)
const publicConfig = new Hono<{ Bindings: Bindings }>()
publicConfig.get('/', async (c) => {
    const res = await c.env.DB.prepare("SELECT value FROM system_config WHERE key = 'deposit_address'").first<any>()
    return c.json({ deposit_address: res?.value || 'T9yD14Nj9...default...' })
})

admin.use('*', authMiddleware)

// Get Visit Stats
admin.get('/stats/visits', async (c) => {
    try {
        const daily = await c.env.DB.prepare('SELECT * FROM daily_visits ORDER BY date DESC LIMIT 30').all()
        const total = await c.env.DB.prepare('SELECT SUM(count) as total FROM daily_visits').first<any>()
        return c.json({ daily: daily.results, total: total?.total || 0 })
    } catch (e) {
        console.error('Stats Error:', e)
        return c.json({ daily: [], total: 0 })
    }
})

// Get Orders (Enhanced with user details)
admin.get('/orders', async (c) => {
  const { status } = c.req.query()
  let query = 'SELECT bets.*, users.email, users.name, users.uid FROM bets JOIN users ON bets.user_id = users.id WHERE 1=1'
  const params: any[] = []

  if (status) {
    query += ' AND bets.status = ?'
    params.push(status)
  }
  
  query += ' ORDER BY bets.created_at DESC LIMIT 50'
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(results)
})

// Manual Settle
admin.post('/bet/:id/settle', async (c) => {
    const id = c.req.param('id')
    const { outcome } = await c.req.json() 
    
    const bet = await c.env.DB.prepare('SELECT * FROM bets WHERE id = ?').bind(id).first<any>()
    if (!bet || bet.status !== 'pending') return c.json({ error: 'Invalid bet' }, 400)

    try {
        const batch = []
        batch.push(c.env.DB.prepare("UPDATE bets SET status = ?, settled_at = CURRENT_TIMESTAMP WHERE id = ?").bind(outcome, id))
        
        if (outcome === 'won') {
            batch.push(c.env.DB.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").bind(bet.potential_payout, bet.user_id))
            batch.push(c.env.DB.prepare("INSERT INTO transactions (user_id, type, amount, status, note) VALUES (?, 'payout', ?, 'completed', ?)").bind(bet.user_id, bet.potential_payout, `Win: Ticket ${bet.ticket_id}`))
        } else if (outcome === 'void') {
            batch.push(c.env.DB.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").bind(bet.amount, bet.user_id))
            batch.push(c.env.DB.prepare("INSERT INTO transactions (user_id, type, amount, status, note) VALUES (?, 'payout', ?, 'completed', ?)").bind(bet.user_id, bet.amount, `Refund: Ticket ${bet.ticket_id}`))
        }

        await c.env.DB.batch(batch)
        return c.json({ success: true })
    } catch (e) {
        return c.json({ error: 'Failed' }, 500)
    }
})

// Finance (With User info and updated fields)
admin.get('/transactions', async (c) => {
  const { search } = c.req.query()
  let query = "SELECT transactions.*, users.email, users.name, users.uid FROM transactions JOIN users ON transactions.user_id = users.id WHERE type IN ('deposit', 'withdraw', 'adjustment')"
  const params: any[] = []

  if (search) {
      query += ' AND (users.uid LIKE ? OR users.email LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
  }

  query += ' ORDER BY transactions.created_at DESC LIMIT 50'
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(results)
})

// Update Transaction Address (And User Address)
admin.post('/transaction/:id/address', async (c) => {
    const id = c.req.param('id')
    const { address } = await c.req.json()
    
    const tx = await c.env.DB.prepare('SELECT user_id FROM transactions WHERE id = ?').bind(id).first<any>()
    if (!tx) return c.json({ error: 'Tx not found' }, 404)

    await c.env.DB.batch([
        c.env.DB.prepare('UPDATE transactions SET wallet_address = ? WHERE id = ?').bind(address, id),
        c.env.DB.prepare('UPDATE users SET usdt_address = ? WHERE id = ?').bind(address, tx.user_id)
    ])
    
    return c.json({ success: true })
})

// Approve Transaction
admin.post('/transaction/:id/approve', async (c) => {
  const id = c.req.param('id')
  const tx = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first<any>()
  if (!tx || tx.status !== 'pending') return c.json({ error: 'Invalid tx' }, 400)

  try {
    if (tx.type === 'deposit') {
      // Ensure amount is a number and valid
      const amountToAdd = Number(tx.amount)
      if (isNaN(amountToAdd)) throw new Error('Invalid Amount')

      await c.env.DB.batch([
        c.env.DB.prepare('UPDATE users SET balance = COALESCE(balance, 0) + ? WHERE id = ?').bind(amountToAdd, tx.user_id),
        c.env.DB.prepare("UPDATE transactions SET status = 'completed' WHERE id = ?").bind(id),
        c.env.DB.prepare("INSERT INTO notifications (target_uid, title, message) VALUES (?, ?, ?)").bind(tx.uid, 'Depósito Aprovado', `Seu depósito de R$ ${amountToAdd.toFixed(2)} foi confirmado.`)
      ])
    } else if (tx.type === 'withdraw') {
      // Withdraw already deducted balance on request, so just mark complete
      await c.env.DB.batch([
          c.env.DB.prepare("UPDATE transactions SET status = 'completed' WHERE id = ?").bind(id),
          c.env.DB.prepare("INSERT INTO notifications (target_uid, title, message) VALUES (?, ?, ?)").bind(tx.uid, 'Saque Processado', `Seu saque de R$ ${Number(tx.amount).toFixed(2)} foi enviado.`)
      ])
    }
    return c.json({ success: true })
  } catch (e) {
    console.error('Approve Error:', e)
    return c.json({ error: 'Failed' }, 500)
  }
})

// Reject Transaction
admin.post('/transaction/:id/reject', async (c) => {
  const id = c.req.param('id')
  const { reason } = await c.req.json()
  const tx = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first<any>()
  if (!tx || tx.status !== 'pending') return c.json({ error: 'Invalid tx' }, 400)

  try {
    // If withdraw was rejected, refund the held amount
    if (tx.type === 'withdraw') {
        await c.env.DB.batch([
            c.env.DB.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').bind(tx.amount, tx.user_id),
            c.env.DB.prepare("UPDATE transactions SET status = 'rejected' WHERE id = ?").bind(id),
            c.env.DB.prepare("INSERT INTO notifications (target_uid, title, message) VALUES (?, ?, ?)").bind(tx.uid, 'Saque Recusado', `Motivo: ${reason || 'Não informado'}. Por favor, entre em contato com o suporte.`)
        ])
    } else {
        await c.env.DB.batch([
            c.env.DB.prepare("UPDATE transactions SET status = 'rejected' WHERE id = ?").bind(id),
            c.env.DB.prepare("INSERT INTO notifications (target_uid, title, message) VALUES (?, ?, ?)").bind(tx.uid, 'Transação Recusada', `Sua solicitação de ${tx.type === 'deposit' ? 'depósito' : 'transação'} foi recusada. Motivo: ${reason || 'Não informado'}. Por favor, entre em contato com o suporte.`)
        ])
    }
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'Failed' }, 500)
  }
})

// Get Users
admin.get('/users', async (c) => {
    const { search } = c.req.query()
    let query = 'SELECT id, uid, invite_code, email, name, role, commission_rate, balance, kyc_status, status, created_at FROM users'
    const params: any[] = []

    if (search) {
        query += ' WHERE uid LIKE ? OR email LIKE ? OR name LIKE ?'
        params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    query += ' ORDER BY created_at DESC LIMIT 50'
    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    return c.json(results)
})

// Get Single User Details with Stats
admin.get('/user/:id', async (c) => {
    const id = c.req.param('id')
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<any>()
    
    if (user) {
        // Calculate financial stats
        const deposits = await c.env.DB.prepare("SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'deposit' AND status = 'completed'").bind(id).first<any>()
        const withdrawals = await c.env.DB.prepare("SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'withdraw' AND status = 'completed'").bind(id).first<any>()
        const bets = await c.env.DB.prepare("SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'bet' AND status = 'completed'").bind(id).first<any>()
        
        // Get Upline & Downline
        const upline = await c.env.DB.prepare('SELECT uid FROM users WHERE id = ?').bind(user.parent_id).first<any>()
        const downline = await c.env.DB.prepare('SELECT uid FROM users WHERE parent_id = ?').bind(id).all()

        user.stats = {
            total_deposits: deposits?.total || 0,
            total_withdrawals: withdrawals?.total || 0,
            total_bets: bets?.total || 0
        }
        
        user.upline_uid = upline?.uid || null
        user.downline_uids = downline.results ? downline.results.map((u: any) => u.uid) : []

        // Expose withdrawal details safely
        if (user.pix_info) {
            try {
                user.pix_info_parsed = JSON.parse(user.pix_info)
            } catch (e) { user.pix_info_parsed = null }
        }
    }
    
    return c.json(user)
})

// Update User Rate
admin.post('/user/:id/rate', async (c) => {
    const id = c.req.param('id')
    const { rate } = await c.req.json()
    await c.env.DB.prepare('UPDATE users SET commission_rate = ? WHERE id = ?').bind(rate, id).run()
    return c.json({ success: true })
})

// Update User Balance
admin.post('/user/:id/balance', async (c) => {
    const id = c.req.param('id')
    const { amount, type } = await c.req.json() // type: 'add' | 'deduct'
    
    const operator = type === 'add' ? '+' : '-'
    
    // Record admin adjustment
    await c.env.DB.prepare(`INSERT INTO transactions (user_id, type, amount, status, note) VALUES (?, 'adjustment', ?, 'completed', ?)`)
        .bind(id, amount, `Admin ${type === 'add' ? 'Added' : 'Deducted'} Balance`)
        .run()

    await c.env.DB.prepare(`UPDATE users SET balance = balance ${operator} ? WHERE id = ?`).bind(amount, id).run()
    
    return c.json({ success: true })
})

// KYC Review
admin.post('/user/:id/kyc', async (c) => {
    const id = c.req.param('id')
    const { status, reason } = await c.req.json() // 'verified' | 'rejected'
    
    await c.env.DB.prepare('UPDATE users SET kyc_status = ? WHERE id = ?').bind(status, id).run()
    
    // Send Notification regardless of status
    const user = await c.env.DB.prepare('SELECT uid, kyc_bonus_claimed FROM users WHERE id = ?').bind(id).first<any>()
    if (user) {
        if (status === 'rejected') {
            await c.env.DB.prepare('INSERT INTO notifications (target_uid, title, message) VALUES (?, ?, ?)').bind(user.uid, 'Falha na Verificação', `Motivo: ${reason || 'Documentos inválidos'}. Por favor, entre em contato com o suporte no Centro Pessoal para resolver.`).run()
        } else if (status === 'verified') {
            const batch = []
            batch.push(c.env.DB.prepare('INSERT INTO notifications (target_uid, title, message) VALUES (?, ?, ?)').bind(user.uid, 'Verificação Aprovada', 'Sua identidade foi verificada com sucesso.'))
            
            // Give Bonus if first time
            if (!user.kyc_bonus_claimed) {
                batch.push(c.env.DB.prepare('UPDATE users SET bonus = bonus + 20, kyc_bonus_claimed = 1 WHERE id = ?').bind(id))
                batch.push(c.env.DB.prepare('INSERT INTO notifications (target_uid, title, message) VALUES (?, ?, ?)').bind(user.uid, 'Bônus de KYC', 'Você recebeu R$ 20,00 de bônus por verificar sua conta!'))
            }
            
            await c.env.DB.batch(batch)
        }
    }
    
    return c.json({ success: true })
})

// Toggle User Status (Active/Frozen)
admin.post('/user/:id/toggle-status', async (c) => {
    const id = c.req.param('id')
    const user = await c.env.DB.prepare('SELECT status FROM users WHERE id = ?').bind(id).first<any>()
    const newStatus = user.status === 'frozen' ? 'active' : 'frozen'
    await c.env.DB.prepare('UPDATE users SET status = ? WHERE id = ?').bind(newStatus, id).run()
    return c.json({ success: true, status: newStatus })
})

// Delete User
admin.delete('/user/:id', async (c) => {
    const id = c.req.param('id')
    // Ideally we should soft-delete or check dependencies, but for this request we delete.
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
    return c.json({ success: true })
})

// Reset User Password (Default: 123456)
admin.post('/user/:id/reset-password', async (c) => {
    const id = c.req.param('id')
    const defaultPass = await hash('123456', 10)
    await c.env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(defaultPass, id).run()
    return c.json({ success: true, message: 'Senha resetada para 123456' })
})

// Reset User PIN (Clear it)
admin.post('/user/:id/reset-pin', async (c) => {
    const id = c.req.param('id')
    // Set to NULL so user can set a new one without old PIN
    await c.env.DB.prepare('UPDATE users SET payment_pin = NULL WHERE id = ?').bind(id).run()
    return c.json({ success: true, message: 'PIN removido. Usuário pode criar um novo.' })
})

// Get System Config
admin.get('/config', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT * FROM system_config').all()
    const config: any = {}
    results.forEach((row: any) => config[row.key] = row.value)
    return c.json(config)
})

// Update System Config
admin.post('/config', async (c) => {
    const { key, value } = await c.req.json()
    await c.env.DB.prepare('INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?').bind(key, value, value).run()
    return c.json({ success: true })
})

// Send Notification
admin.post('/notify', async (c) => {
    const { target_uid, title, message } = await c.req.json()
    await c.env.DB.prepare('INSERT INTO notifications (target_uid, title, message) VALUES (?, ?, ?)').bind(target_uid || null, title, message).run()
    return c.json({ success: true })
})

// --- Manual Match Management ---

// Create Manual Match
admin.post('/matches', async (c) => {
    const { league_name, home_team, away_team, commence_time, home_odds, draw_odds, away_odds } = await c.req.json()
    
    // Simple Validation
    if (!league_name || !home_team || !away_team || !commence_time || !home_odds || !draw_odds || !away_odds) {
        return c.json({ error: 'Missing required fields' }, 400)
    }

    const id = `manual_${Date.now()}_${Math.floor(Math.random() * 1000)}`

    try {
        await c.env.DB.prepare(`
            INSERT INTO manual_matches (id, league_name, home_team, away_team, commence_time, home_odds, draw_odds, away_odds)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, league_name, home_team, away_team, commence_time, home_odds, draw_odds, away_odds).run()
        
        return c.json({ success: true, id })
    } catch (e) {
        console.error('Create Match Error:', e)
        return c.json({ error: 'Failed to create match' }, 500)
    }
})

// Get Manual Matches
admin.get('/matches', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT * FROM manual_matches ORDER BY commence_time ASC').all()
    return c.json(results)
})

// Delete Manual Match
admin.delete('/matches/:id', async (c) => {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM manual_matches WHERE id = ?').bind(id).run()
    return c.json({ success: true })
})

// Update Exchange Rate
admin.post('/config/rate', async (c) => {
    const { rate } = await c.req.json()
    const newRate = parseFloat(rate)
    
    if (!newRate || newRate <= 0) {
        return c.json({ error: 'Invalid rate' }, 400)
    }

    await c.env.DB.prepare("INSERT OR REPLACE INTO exchange_rates (pair, rate, updated_at) VALUES ('USDT_BRL', ?, ?)").bind(newRate, Date.now()).run()
    return c.json({ success: true, rate: newRate })
})

// Sync Real-time Rate (AwesomeAPI)
admin.post('/config/rate/sync', async (c) => {
    try {
        console.log('[Rate Sync] Fetching from AwesomeAPI...')
        const resp = await fetch('https://economia.awesomeapi.com.br/json/last/USDT-BRL')
        
        if (!resp.ok) throw new Error('API Request Failed')
        
        const data: any = await resp.json()
        // Data format: { USDTBRL: { bid: "5.85", ... } }
        
        if (!data.USDTBRL || !data.USDTBRL.bid) {
            throw new Error('Invalid API Response')
        }

        const realRate = parseFloat(data.USDTBRL.bid)
        
        // Safety check
        if (isNaN(realRate) || realRate <= 0) throw new Error('Invalid Rate Value')

        // Update DB
        await c.env.DB.prepare("INSERT OR REPLACE INTO exchange_rates (pair, rate, updated_at) VALUES ('USDT_BRL', ?, ?)").bind(realRate, Date.now()).run()
        
        return c.json({ success: true, rate: realRate })
    } catch (e: any) {
        console.error('[Rate Sync Error]', e)
        return c.json({ error: 'Failed to sync: ' + e.message }, 500)
    }
})

export { publicConfig }
export default admin
