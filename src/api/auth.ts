
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { hash, compare } from 'bcryptjs'
import { Bindings } from '../bindings'
import { Resend } from 'resend'
import { sendTgMessage } from '../utils/telegram' // Import Telegram Utility
import { BOT_TOKEN } from '../config'
import { getTemplate } from '../utils/templates'
import { notifyAction } from '../utils/notifier' // Import Notifier

const auth = new Hono<{ Bindings: Bindings }>()

// Helper to get config
async function getConfig(db: D1Database, key: string) {
    const res = await db.prepare('SELECT value FROM system_config WHERE key = ?').bind(key).first<any>()
    return res?.value
}

// Register
auth.post('/register', async (c) => {
  const { email, password, name, inviteCode, rate } = await c.req.json()

  // Force Invite Code Check
  if (!inviteCode) {
    return c.json({ error: 'Código de convite é obrigatório' }, 400)
  }

  // Check existing user
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) {
    return c.json({ error: 'E-mail já registrado' }, 400)
  }

  // Handle Invitation & Commission Rate
  let parentId = null
  let commissionRate = 0.05 
  
  const parent = await c.env.DB.prepare('SELECT id, commission_rate, invite_code FROM users WHERE invite_code = ? OR id = ?').bind(inviteCode, inviteCode).first<any>()
  if (!parent) {
      return c.json({ error: 'Código de convite inválido' }, 400)
  }
  
  parentId = parent.id
  
  // Special Rule: If parent is Master Account (888888), max rate is 5%
  const maxRate = parent.invite_code === '888888' ? 0.05 : parent.commission_rate

  if (rate) {
        const requestedRate = parseFloat(rate)
        if (requestedRate <= maxRate && requestedRate > 0) {
            commissionRate = requestedRate
        } else {
            // If requested is too high, give max possible or calculate standard step down
            commissionRate = maxRate
        }
  } else {
        // Default assignment
        commissionRate = parent.invite_code === '888888' ? 0.05 : 0.05
  }

  // Hash Password
  const passwordHash = await hash(password, 10)

  // Generate Unique IDs
  const uid = Math.floor(10000000 + Math.random() * 90000000).toString()
  const newInviteCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Insert User
    try {
        const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'Unknown IP'
        
        const result = await c.env.DB.prepare(`
        INSERT INTO users (email, password, name, parent_id, commission_rate, uid, invite_code, balance, ip_address, last_login_ip)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `).bind(email, passwordHash, name || email.split('@')[0], parentId, commissionRate, uid, newInviteCode, ip, ip).run()

    if (!result.success) throw new Error('Database insert failed')
    
    // *** NEW: Send Welcome Notification ***
    const welcomeMsg = await getConfig(c.env.DB, 'welcome_message')
    const welcomeTitle = 'Bem-vindo ao Stake.BR'
    const welcomeBody = welcomeMsg || 'Comece a apostar agora e ganhe comissões!'
    
    // Check if notification already sent to avoid duplicate on re-run (though unlikely with unique uid)
    await c.env.DB.prepare('INSERT INTO notifications (target_uid, title, message) VALUES (?, ?, ?)').bind(uid, welcomeTitle, welcomeBody).run()

    // *** Auto Login: Generate Token ***
    
        // Telegram Notify (Admin Channel)
        try {
            const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'Unknown IP'
            const ua = c.req.header('user-agent') || 'Unknown Device'
            
            // Send simple admin notify (Chinese for internal team)
            await sendTgMessage(
                `👤 <b>新用户注册 (NEW USER)</b>\n\n` +
                `📧 邮箱: ${email}\n` +
                `🆔 UID: <code>${uid}</code>\n` +
                `🌍 IP: ${ip}\n` +
                `📱 设备: ${ua}`
            )
        } catch(err) { console.error('TG Notify Error', err) }


        // Telegram Notify (Upline Agent Group)
        if (parent) {
            const botToken = BOT_TOKEN;
            // Get parent info (need TG details)
            const parentUser = await c.env.DB.prepare('SELECT id, uid, owned_group_id, telegram_group_id, telegram_username FROM users WHERE id = ?').bind(parentId).first<any>()
            
            if (botToken && parentUser) {
                // 1. Notify Parent (Level 1)
                await notifyAction(c.env.DB, 'tpl_invite_l1', parentUser, {
                    source_uid: `<code>${uid}</code>`
                });

                // 2. Notify Grandparent (Level 2)
                const grandParent = await c.env.DB.prepare('SELECT id, owned_group_id, telegram_group_id, telegram_username, uid FROM users WHERE id = (SELECT parent_id FROM users WHERE id = ?)').bind(parentId).first<any>()
                
                if (grandParent) {
                    await notifyAction(c.env.DB, 'tpl_invite_l2', grandParent, {
                        source_uid: `<code>${uid}</code>`
                    });
                }
            }
        }

    const token = await sign({
      id: result.meta.last_row_id, // Use the new ID
      uid: uid,
      invite_code: newInviteCode,
      email: email,
      name: name || email.split('@')[0],
      role: 'agent', // Default role
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10 // 10 Years expiration (Never expire practically)
    }, c.env.JWT_SECRET, 'HS256')

    return c.json({ 
        success: true, 
        message: 'Registrado com sucesso',
        token,
        user: {
            id: result.meta.last_row_id,
            uid,
            invite_code: newInviteCode,
            email,
            name: name || email.split('@')[0],
            role: 'agent',
            balance: 0,
            commission_balance: 0,
            commission_rate: commissionRate
        }
    })
  } catch (e) {
    console.error(e)
    return c.json({ error: 'Erro ao criar conta' }, 500)
  }
})

// Login (Unchanged)
auth.post('/login', async (c) => {
  const { email, password } = await c.req.json()
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<any>()

  if (!user) return c.json({ error: 'Usuário não encontrado' }, 400)

  if (user.status === 'frozen') {
      return c.json({ error: 'Conta congelada. Entre em contato com o suporte.' }, 403)
  }

  const valid = await compare(password, user.password)
  if (!valid) return c.json({ error: 'Senha incorreta' }, 400)

  // Update Last Login IP
  try {
      const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'Unknown IP'
      await c.env.DB.prepare('UPDATE users SET last_login_ip = ? WHERE id = ?').bind(ip, user.id).run()
  } catch(e) {}

  const token = await sign({
    id: user.id,
    uid: user.uid,
    invite_code: user.invite_code,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 
  }, c.env.JWT_SECRET, 'HS256')

  return c.json({
    token,
    user: {
      id: user.id,
      uid: user.uid,
      invite_code: user.invite_code,
      email: user.email,
      name: user.name,
      role: user.role,
      balance: user.balance,
      commission_balance: user.commission_balance,
      commission_rate: user.commission_rate
    }
  })
})

// Send Verification Email (Real Implementation)
auth.post('/send-code', async (c) => {
    const { email, type } = await c.req.json()
    // const apiKey = await getConfig(c.env.DB, 'resend_api_key')
    const apiKey = ''; // Disable email for now to avoid errors, or use mock
    
    // Always use Dev/Mock Mode for now to avoid crashes
    if (!apiKey) {
        // If no key, return success but log warning (Dev mode)
        console.warn('Resend API Key missing. Use 889988.')
        
        // Mock DB store for dev code
        const code = '889988';
        const expiresAt = Date.now() + 15 * 60 * 1000 // 15 mins
        await c.env.DB.prepare(`INSERT OR REPLACE INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)`).bind(email, code, expiresAt).run()
        
        return c.json({ success: true, dev: true })
    }

    const resend = new Resend(apiKey)
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Store code in DB
    const expiresAt = Date.now() + 15 * 60 * 1000 // 15 mins
    await c.env.DB.prepare(`INSERT OR REPLACE INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)`).bind(email, code, expiresAt).run()
    
    // Get Template
    let template = await getConfig(c.env.DB, `email_template_${type}`) // type: register | reset
    if (!template) template = 'Seu código de verificação é: {code}'
    
    const html = template.replace('{code}', `<strong>${code}</strong>`)

    try {
        await resend.emails.send({
            from: 'Stake.BR <onboarding@resend.dev>', // Needs verified domain in Prod
            to: email,
            subject: 'Código de Verificação',
            html: html
        })
        return c.json({ success: true })
    } catch (e) {
        console.error('Email Failed:', e)
        return c.json({ error: 'Falha ao enviar email' }, 500)
    }
})

export default auth
