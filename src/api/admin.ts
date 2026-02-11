
import { Hono } from 'hono'
import { Bindings } from '../bindings'
import { authMiddleware } from '../middleware'
import { hash } from 'bcryptjs'
import { createHash } from 'crypto' // Import for MD5 Signature
import { settleMatch } from '../utils/manual_settle' // Import Manual Settle Logic
import { BOT_TOKEN, ADMIN_BOT_TOKEN, ADMIN_GROUP_ID, ADMIN_CHAT_ID } from '../config'
import { getTemplate } from '../utils/templates'

const admin = new Hono<{ Bindings: Bindings, Variables: { user: any } }>()

// Helper: MD5 Signature (For VQPAY)
function sign(data: Record<string, any>, key: string): string {
    const sortedKeys = Object.keys(data)
        .filter(k => k !== 'signature' && k !== 'payer' && k !== 'payee' && data[k] !== null && data[k] !== undefined && data[k] !== '')
        .sort()
    
    const signStr = sortedKeys.map(k => `${k}=${data[k]}`).join('&') + `&key=${key}`
    return createHash('md5').update(signStr, 'utf8').digest('hex').toUpperCase()
}

// Configuration Helper
function getConfig(c: any) {
    return {
        APP_ID: c.env.VQPAY_APP_ID || "sp2017234877044363264m",
        SECRET_SETTLE: c.env.VQPAY_SECRET_SETTLE || "PHNPMM4HYBSFYBTB9EFOSDVBS1EE9GNS",
        API_URL: c.env.VQPAY_API_URL || "https://api.vortaqpay.com",
        MERCHANT_NO: "BC101428"
    }
}

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

// Get Orders (Enhanced with user details & Pagination)
admin.get('/orders', async (c) => {
  const { status, page = '1', limit = '30' } = c.req.query()
  const p = parseInt(page) || 1
  const l = parseInt(limit) || 30
  const offset = (p - 1) * l

  let query = 'SELECT bets.*, users.email, users.name, users.uid FROM bets JOIN users ON bets.user_id = users.id WHERE 1=1'
  const params: any[] = []

  if (status) {
    query += ' AND bets.status = ?'
    params.push(status)
  }
  
  // Count Total
  const countSql = query.replace('SELECT bets.*, users.email, users.name, users.uid', 'SELECT COUNT(*) as total')
  const total = await c.env.DB.prepare(countSql).bind(...params).first<any>()

  query += ` ORDER BY bets.created_at DESC LIMIT ${l} OFFSET ${offset}`
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  
  return c.json({
      data: results,
      total: total?.total || 0,
      page: p,
      last_page: Math.ceil((total?.total || 0) / l)
  })
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

// Finance (With User info, updated fields & Pagination)
admin.get('/transactions', async (c) => {
  const { search, page = '1', limit = '30' } = c.req.query()
  const p = parseInt(page) || 1
  const l = parseInt(limit) || 30
  const offset = (p - 1) * l

  // We fetch user withdrawal details (pix_info) here to display in admin
  let query = "SELECT transactions.*, users.email, users.name, users.uid, users.pix_info, users.usdt_address, users.cpf FROM transactions JOIN users ON transactions.user_id = users.id WHERE type IN ('deposit', 'withdraw', 'adjustment')"
  const params: any[] = []

  if (search) {
      query += ' AND (users.uid LIKE ? OR users.email LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
  }

  // Count Total
  const countSql = query.replace('SELECT transactions.*, users.email, users.name, users.uid, users.pix_info, users.usdt_address, users.cpf', 'SELECT COUNT(*) as total')
  const total = await c.env.DB.prepare(countSql).bind(...params).first<any>()

  query += ` ORDER BY transactions.created_at DESC LIMIT ${l} OFFSET ${offset}`
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  
  return c.json({
      data: results,
      total: total?.total || 0,
      page: p,
      last_page: Math.ceil((total?.total || 0) / l)
  })
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
        c.env.DB.prepare("INSERT INTO notifications (target_uid, title, message) VALUES (?, ?, ?)").bind(tx.uid, 'Depósito Aprovado', `Seu depósito de R$ ${amountToAdd.toFixed(2)} foi aprovado e o saldo já está disponível!`)
      ])
    } else if (tx.type === 'withdraw') {
      
      // *** VQPAY MANUAL APPROVAL LOGIC ***
      // Only for PIX withdrawals (those with note like "VQPay Withdraw: ...")
      // If it's a manual USDT withdraw, we might just mark as complete (assuming admin sent it externally)
      // But if it has a VQPAY order ID in the 'tx_hash', we should trigger VQPAY API.
      
      if (tx.tx_hash && tx.tx_hash.startsWith('WTH_')) {
          // *** RESTORED: AUTO-PAYOUT ON APPROVAL ***
          const config = getConfig(c)
          const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(tx.user_id).first<any>()
          
          // Logic to find the best PIX key
          let vqAccountType = 'CPF'
          let vqAccount = user.cpf || user.document || ''
          
          // Try to use saved PIX info if available
          if (user.pix_info) {
              try {
                  const p = JSON.parse(user.pix_info)
                  if(p.key) {
                      vqAccount = p.key
                      vqAccountType = p.keyType || 'CHAVE'
                  }
              } catch(e) {}
          }
          
          // If no account found, fail
          if (!vqAccount) {
             return c.json({ error: 'Erro: Dados PIX do usuário incompletos. O usuário precisa configurar o perfil.' }, 400)
          }
          
          // Prepare VQPAY Payload
          const orderId = tx.tx_hash 
          const notifyUrl = `https://stakeparceiros.vip/api/vqpay/notify/settle`
          
          const payload = {
            merchant_no: config.MERCHANT_NO,
            data: {
                country: "BR",
                currency: "BRL",
                order_id: orderId,
                amount: Number(tx.amount).toFixed(2),
                notification_url: notifyUrl,
                timestamp: Date.now(),
                payee: {
                    name: user.name || "User",
                    account: vqAccount,
                    account_type: vqAccountType,
                    document: user.cpf || "00000000000"
                }
            }
          }
          
          // Sign
          // @ts-ignore
          payload.data.signature = sign(payload.data, config.SECRET_SETTLE)
          
          console.log('[Admin Approve] Sending to VQPAY:', JSON.stringify(payload))
          
          const resp = await fetch(`${config.API_URL}/api/settle/settlement`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "ApiVersion": "1.0",
                    "AppId": config.APP_ID,
                    "Noncestr": Math.random().toString(36).substring(7),
                    "Timestamp": String(Date.now())
                },
                body: JSON.stringify(payload)
          })
          
          const text = await resp.text()
          console.log('[Admin Approve] VQPAY Response:', text)
          
          let result: any
          try {
             result = JSON.parse(text)
          } catch (e) {
             return c.json({ error: 'Erro na resposta do VQPAY' }, 502)
          }
          
          if (result.state !== 'ok') {
              // Detailed error mapping
              const errMsg = result.msg || result.error || 'Falha no pagamento'
              return c.json({ error: `VQPAY Recusou: ${errMsg}` }, 400)
          }
          
          // SUCCESS! Flow continues to update DB below...
      }

      // Withdraw already deducted balance on request, so just mark complete
      await c.env.DB.batch([
          c.env.DB.prepare("UPDATE transactions SET status = 'completed' WHERE id = ?").bind(id),
          c.env.DB.prepare("INSERT INTO notifications (target_uid, title, message) VALUES (?, ?, ?)").bind(tx.uid || user.uid, 'Saque Enviado', `Seu saque de R$ ${Number(tx.amount).toFixed(2)} foi aprovado e os fundos foram enviados.`)
      ])
    }

    // --- NOTIFICATIONS ---
    const botToken = BOT_TOKEN;
    if (!botToken) return c.json({ success: true });

    // 1. Notify User (Self Group)
    // Fetch user info for notification
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(tx.user_id).first<any>()
    
    // Check Internal Staff -> REMOVED PRIVACY CHECK
    const parentInfo = await c.env.DB.prepare("SELECT id, invite_code, owned_group_id FROM users WHERE id = ?").bind(user.parent_id).first<any>();
    // const isInternal = parentInfo?.invite_code === '888888';
    const maskedUID = user.uid; // Full UID

    if (user) { // Always notify if user exists
        // A. Self Notification
        if (user.telegram_group_id) {
            let msg = ''
            if (tx.type === 'withdraw') {
                msg = await getTemplate(c.env.DB, 'tpl_withdraw', { uid: maskedUID, amount: Number(tx.amount).toFixed(2) }, user.id);
            } else if (tx.type === 'deposit') {
                msg = await getTemplate(c.env.DB, 'tpl_deposit', { uid: maskedUID, amount: Number(tx.amount).toFixed(2) }, user.id);
            }

            if (msg) {
                fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: user.telegram_group_id, text: msg, parse_mode: 'HTML' })
                }).catch(e => {})
            }
        }

        // B. Upline Notification (Downline Activity)
        if (parentInfo) {
            // We need parent's UID for the template. parentInfo select needs to include UID.
            // But wait, parentInfo select only has id, invite_code, owned_group_id.
            // Let's refetch parentInfo with UID.
            const fullParent = await c.env.DB.prepare("SELECT uid, owned_group_id, telegram_group_id FROM users WHERE id = ?").bind(user.parent_id).first<any>();
            const targetGroupId = fullParent?.owned_group_id || fullParent?.telegram_group_id;
            
            if (fullParent && targetGroupId) {
                const parentMaskedUID = fullParent.uid; // Full UID
                
                let msg = ''
                if (tx.type === 'withdraw') {
                    msg = await getTemplate(c.env.DB, 'tpl_downline_withdraw', { 
                        member_uid: parentMaskedUID, 
                        source_uid: maskedUID, 
                        amount: Number(tx.amount).toFixed(2) 
                    });
                } else if (tx.type === 'deposit') {
                    msg = await getTemplate(c.env.DB, 'tpl_downline_deposit', { 
                        member_uid: parentMaskedUID, 
                        source_uid: maskedUID, 
                        amount: Number(tx.amount).toFixed(2) 
                    });
                }

                if (msg) {
                    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: targetGroupId, text: msg, parse_mode: 'HTML' })
                    }).catch(e => {})
                }
            }
        }
    }

    return c.json({ success: true })
  } catch (e: any) {
    console.error('Approve Error:', e)
    return c.json({ error: e.message || 'Failed' }, 500)
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
    const { search, page = '1', limit = '30' } = c.req.query()
    const p = parseInt(page) || 1
    const l = parseInt(limit) || 30
    const offset = (p - 1) * l

    let baseQuery = 'FROM users u LEFT JOIN users p ON u.parent_id = p.id'
    let whereClause = ''
    const params: any[] = []

    if (search) {
        whereClause = ' WHERE u.uid LIKE ? OR u.email LIKE ? OR u.name LIKE ? OR u.ip_address LIKE ?'
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
    }

    // Count Total
    const countSql = `SELECT COUNT(*) as total ${baseQuery} ${whereClause}`
    const total = await c.env.DB.prepare(countSql).bind(...params).first<any>()

    // Fetch Data
    const dataSql = `SELECT u.id, u.uid, u.invite_code, u.email, u.name, u.role, u.commission_rate, u.balance, u.kyc_status, u.status, u.created_at, u.ip_address, u.last_login_ip, u.telegram_group_id, u.telegram_username, u.owned_group_id, u.kyc_image_front, u.kyc_image_back, u.real_name, u.cpf, p.uid as parent_uid, p.invite_code as parent_code ${baseQuery} ${whereClause} ORDER BY u.created_at DESC LIMIT ${l} OFFSET ${offset}`
    
    const { results } = await c.env.DB.prepare(dataSql).bind(...params).all()
    
    return c.json({
        data: results,
        total: total?.total || 0,
        page: p,
        last_page: Math.ceil((total?.total || 0) / l)
    })
})

// Get Group Management Stats
admin.get('/groups', async (c) => {
    // 1. Get all Group Owners
    const owners = await c.env.DB.prepare(`
        SELECT id, uid, telegram_username, owned_group_id, created_at 
        FROM users 
        WHERE owned_group_id IS NOT NULL
    `).all();

    if (!owners.results || owners.results.length === 0) {
        return c.json([]);
    }

    // 2. Aggregate Member Counts per Group
    const memberCounts = await c.env.DB.prepare(`
        SELECT telegram_group_id, COUNT(*) as count 
        FROM users 
        WHERE telegram_group_id IS NOT NULL 
        GROUP BY telegram_group_id
    `).all();

    // Map for fast lookup
    const memberMap = new Map();
    memberCounts.results.forEach((row: any) => {
        memberMap.set(String(row.telegram_group_id), row.count);
    });

    // 3. Aggregate Financials per Group (Deposits & Bets)
    // We only care about COMPLETED transactions
    const financials = await c.env.DB.prepare(`
        SELECT u.telegram_group_id, t.type, SUM(t.amount) as total
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        WHERE u.telegram_group_id IS NOT NULL 
          AND t.status = 'completed'
          AND t.type IN ('deposit', 'bet', 'commission')
        GROUP BY u.telegram_group_id, t.type
    `).all();

    // Nested Map: GroupID -> Type -> Amount
    const financeMap = new Map();
    financials.results.forEach((row: any) => {
        const gid = String(row.telegram_group_id);
        if (!financeMap.has(gid)) financeMap.set(gid, {});
        financeMap.get(gid)[row.type] = row.total;
    });

    // 4. Combine Data
    const groups = owners.results.map((owner: any) => {
        const gid = String(owner.owned_group_id);
        const fins = financeMap.get(gid) || {};
        
        return {
            group_id: gid,
            owner_uid: owner.uid,
            owner_username: owner.telegram_username || 'Unknown',
            member_count: memberMap.get(gid) || 0,
            total_deposit: fins['deposit'] || 0,
            total_bet: fins['bet'] || 0, // Performance/Turnover
            total_commission: fins['commission'] || 0
        };
    });

    // Sort by Total Deposit DESC
    groups.sort((a: any, b: any) => b.total_deposit - a.total_deposit);

    return c.json(groups);
})

// Unbind Telegram
admin.post('/user/:id/unbind', async (c) => {
    const id = c.req.param('id')
    const { type } = await c.req.json() // 'owner' | 'member'
    
    if (type === 'owner') {
        await c.env.DB.prepare('UPDATE users SET owned_group_id = NULL WHERE id = ?').bind(id).run()
    } else if (type === 'member') {
        await c.env.DB.prepare('UPDATE users SET telegram_group_id = NULL WHERE id = ?').bind(id).run()
    } else {
        return c.json({ error: 'Invalid type' }, 400)
    }
    
    return c.json({ success: true })
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
        const upline = await c.env.DB.prepare('SELECT id, uid, email FROM users WHERE id = ?').bind(user.parent_id).first<any>()
        const downline = await c.env.DB.prepare('SELECT id, uid, email FROM users WHERE parent_id = ?').bind(id).all()

        user.stats = {
            total_deposits: deposits?.total || 0,
            total_withdrawals: withdrawals?.total || 0,
            total_bets: bets?.total || 0
        }
        
        user.upline = upline || null
        user.downline = downline.results || []
        user.upline_uid = upline?.uid || null // Keep for backward compatibility if needed
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
    
    // Send Notification if it's a bonus (add)
    if (type === 'add') {
        const user = await c.env.DB.prepare('SELECT uid FROM users WHERE id = ?').bind(id).first<any>()
        if (user) {
            await c.env.DB.prepare("INSERT INTO notifications (target_uid, title, message) VALUES (?, ?, ?)").bind(user.uid, 'Bônus Recebido', `Você recebeu um bônus de R$ ${Number(amount).toFixed(2)} em sua conta!`).run()
        }
    }

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
                batch.push(c.env.DB.prepare('UPDATE users SET balance = balance + 8.88, kyc_bonus_claimed = 1 WHERE id = ?').bind(id))
                batch.push(c.env.DB.prepare('INSERT INTO notifications (target_uid, title, message) VALUES (?, ?, ?)').bind(user.uid, 'Bônus de KYC', 'Você recebeu R$ 8,88 de bônus por verificar sua conta!'))
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
    
    // Default values from code/env
    const config: any = {
        bot_token: BOT_TOKEN,
        support_admin_group: ADMIN_GROUP_ID,
        admin_bot_token: ADMIN_BOT_TOKEN,
        admin_chat_id: ADMIN_CHAT_ID
    }
    
    // Override with DB values
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

// --- NEW: Manual Settlement Endpoints ---

// Get Pending Matches (Matches that have pending bets)
admin.get('/settle/pending', async (c) => {
    // 1. Get Distinct Match IDs from Single Bets
    const singles = await c.env.DB.prepare("SELECT DISTINCT match_id, match_info FROM bets WHERE status = 'pending' AND match_id != 'parlay'").all()
    
    // 2. Get Match IDs from Parlays
    const parlays = await c.env.DB.prepare("SELECT match_info FROM bets WHERE status = 'pending' AND match_id = 'parlay'").all()
    
    const matchMap = new Map()
    
    // Process Singles
    singles.results.forEach((row: any) => {
        try {
            const info = JSON.parse(row.match_info)
            matchMap.set(row.match_id, {
                id: row.match_id,
                home: info.home || info.home_team,
                away: info.away || info.away_team,
                league: info.league || 'Unknown',
                time: info.commence_time || info.time
            })
        } catch(e) {}
    })

    // Process Parlays (Extract pending legs)
    parlays.results.forEach((row: any) => {
        try {
            const info = JSON.parse(row.match_info)
            if (info.legs && Array.isArray(info.legs)) {
                info.legs.forEach((leg: any) => {
                    if (!leg.status || leg.status === 'pending') {
                        if (!matchMap.has(leg.matchId)) {
                            // Extract names from "Home vs Away" string if stored that way
                            const [h, a] = (leg.match || ' vs ').split(' vs ')
                            
                            // Try to get time from leg.matchInfo if available (new format)
                            let legTime = null;
                            if (leg.matchInfo && leg.matchInfo.date) {
                                legTime = leg.matchInfo.date;
                            }

                            matchMap.set(leg.matchId, {
                                id: leg.matchId,
                                home: h ? h.trim() : 'Unknown',
                                away: a ? a.trim() : 'Unknown',
                                league: 'Parlay Leg',
                                time: legTime 
                            })
                        }
                    }
                })
            }
        } catch(e) {}
    })

    const matches = Array.from(matchMap.values())
    
    // Sort by Time (Oldest first -> Matches that likely ended)
    // Matches with null time go to bottom
    matches.sort((a: any, b: any) => {
        if (!a.time) return 1
        if (!b.time) return -1
        return new Date(a.time).getTime() - new Date(b.time).getTime()
    })

    return c.json(matches)
})

// Submit Score & Settle
admin.post('/settle/match/:id', async (c) => {
    const matchId = c.req.param('id')
    const { home, away, homeHT, awayHT, htFtOverride } = await c.req.json()
    
    const hScore = parseInt(home)
    const aScore = parseInt(away)
    
    // Optional HT scores (default to undefined if not provided)
    const hScoreHT = homeHT !== undefined && homeHT !== '' ? parseInt(homeHT) : undefined
    const aScoreHT = awayHT !== undefined && awayHT !== '' ? parseInt(awayHT) : undefined
    
    if (isNaN(hScore) || isNaN(aScore)) {
        return c.json({ error: 'Placar inválido' }, 400)
    }

    try {
        const result = await settleMatch(c.env.DB, matchId, { 
            homeScore: hScore, 
            awayScore: aScore,
            homeScoreHT: hScoreHT,
            awayScoreHT: aScoreHT,
            htFtResult: htFtOverride || undefined // Pass explicit override if provided
        })
        return c.json({ success: true, ...result })
    } catch(e) {
        console.error('Settle Error:', e)
        return c.json({ error: 'Erro ao processar liquidação' }, 500)
    }
})

// Get Bot Config
admin.get('/bot-config', async (c) => {
    const keys = [
        'bot_welcome', 'bot_buttons', 
        'tpl_new_member', 'tpl_bet', 'tpl_win', 'tpl_deposit', 'tpl_withdraw',
        'tpl_downline_deposit', 'tpl_downline_withdraw', 'tpl_downline_bet', 'tpl_downline_win', 'tpl_commission', 
        'tpl_invite_l1', 'tpl_invite_l2'
    ]
    const placeholders = keys.map(() => '?').join(',')
    const { results } = await c.env.DB.prepare(`SELECT key, value FROM system_config WHERE key IN (${placeholders})`).bind(...keys).all()
    
    const config: any = {}
    results.forEach((row: any) => config[row.key] = row.value)
    
    // Parse buttons safely
    try {
        config.bot_buttons = JSON.parse(config.bot_buttons || '[]')
    } catch(e) {
        config.bot_buttons = []
    }
    
    return c.json(config)
})

// Update Bot Config (Batch or Single)
admin.post('/bot-config', async (c) => {
    const body = await c.req.json()
    const batch = []
    
    for (const [key, value] of Object.entries(body)) {
        let valToStore = value;
        // Basic validation for buttons JSON
        if (key === 'bot_buttons' && typeof value === 'string') {
            try {
                JSON.parse(value as string) // Verify JSON
            } catch(e) {
                return c.json({ error: 'Invalid JSON for buttons' }, 400)
            }
        }
        
        batch.push(c.env.DB.prepare('INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?').bind(key, valToStore, valToStore))
    }
    
    await c.env.DB.batch(batch)
    return c.json({ success: true })
})

export { publicConfig }
export default admin
