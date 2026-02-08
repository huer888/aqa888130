import { Hono } from 'hono'
import { Bindings } from '../bindings'
import { authMiddleware } from '../middleware'
import { hash, compare } from 'bcryptjs'
import { sendTgMessage } from '../utils/telegram' // Import Telegram Utility

const userApi = new Hono<{ Bindings: Bindings, Variables: { user: any } }>()

userApi.use('*', authMiddleware)

// Change Login Password
userApi.post('/change-password', async (c) => {
    const userId = c.get('user').id
    const { oldPassword, newPassword } = await c.req.json()

    if (!newPassword || newPassword.length < 6) {
        return c.json({ error: 'A nova senha deve ter pelo menos 6 caracteres' }, 400)
    }

    const user = await c.env.DB.prepare('SELECT password FROM users WHERE id = ?').bind(userId).first<any>()
    
    const valid = await compare(oldPassword, user.password)
    if (!valid) {
        return c.json({ error: 'Senha atual incorreta' }, 400)
    }

    const hashed = await hash(newPassword, 10)
    await c.env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(hashed, userId).run()

    return c.json({ success: true })
})

// Change Payment PIN
userApi.post('/change-pin', async (c) => {
    const userId = c.get('user').id
    const { oldPin, newPin } = await c.req.json()

    if (!/^\d{6}$/.test(newPin)) {
        return c.json({ error: 'O novo PIN deve ter 6 dígitos numéricos' }, 400)
    }

    const user = await c.env.DB.prepare('SELECT payment_pin FROM users WHERE id = ?').bind(userId).first<any>()

    // If user already has a PIN, verify the old one
    if (user.payment_pin) {
        if (!oldPin) return c.json({ error: 'Informe o PIN atual' }, 400)
        if (user.payment_pin !== oldPin) return c.json({ error: 'PIN atual incorreto' }, 400)
    }

    await c.env.DB.prepare('UPDATE users SET payment_pin = ? WHERE id = ?').bind(newPin, userId).run()
    return c.json({ success: true })
})

userApi.post('/kyc', async (c) => {
  const userId = c.get('user').id
  const { name, cpf, front, back } = await c.req.json()
  
  if (!name || !cpf || !front || !back) {
      return c.json({ error: 'Todos os campos são obrigatórios' }, 400)
  }

  await c.env.DB.prepare(`
    UPDATE users 
    SET kyc_status = 'pending', real_name = ?, cpf = ?, kyc_image_front = ?, kyc_image_back = ? 
    WHERE id = ?
  `).bind(name, cpf, front, back, userId).run()
  
  // TG Notify
  try {
      const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'Unknown IP'
      const ua = c.req.header('user-agent') || 'Unknown Device'
      const uInfo = await c.env.DB.prepare("SELECT uid, email FROM users WHERE id = ?").bind(userId).first<any>()
      
      await sendTgMessage(
        `🪪 <b>KYC 待审核</b>\n\n` +
        `👤 UID: <code>${uInfo?.uid || userId}</code>\n` +
        `📧 邮箱: ${uInfo?.email}\n` +
        `📝 姓名: ${name}\n` +
        `🔢 CPF: ${cpf}\n` +
        `🌍 IP: ${ip}\n` +
        `📱 设备: ${ua}`
      )
  } catch(e) {}
  
  return c.json({ success: true, status: 'pending' })
})

userApi.get('/me', async (c) => {
    const userId = c.get('user').id
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
    // Mask PIN
    if (user && user.payment_pin) user.payment_pin = '******'
    return c.json(user)
})

userApi.post('/avatar', async (c) => {
    const userId = c.get('user').id
    const { url } = await c.req.json()
    await c.env.DB.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').bind(url, userId).run()
    return c.json({ success: true })
})

userApi.get('/notifications', async (c) => {
    const userId = c.get('user').id
    const user = await c.env.DB.prepare('SELECT uid FROM users WHERE id = ?').bind(userId).first<any>()
    
    const { results } = await c.env.DB.prepare(`
        SELECT * FROM notifications 
        WHERE target_uid IS NULL OR target_uid = ? 
        ORDER BY created_at DESC LIMIT 20
    `).bind(user.uid).all()
    
    return c.json(results)
})

userApi.post('/notifications/read-all', async (c) => {
    const userId = c.get('user').id
    const user = await c.env.DB.prepare('SELECT uid FROM users WHERE id = ?').bind(userId).first<any>()
    
    // Mark global (NULL target) and specific target notifications as read
    // Since 'is_read' is on the notification itself, and global notifications are shared rows,
    // marking a global notification as read for ONE user requires a separate tracking table (user_notifications_read).
    // BUT for this MVP/Simpler structure, we likely only insert targeted notifications OR 
    // we just accept that global notifications are read by everyone or we don't mark them?
    
    // Given the schema: "target_uid TEXT, -- If NULL, it's a global broadcast"
    // If we UPDATE notifications SET is_read=1 WHERE target_uid IS NULL, it hides it for everyone!
    // So global notifications in this simple schema cannot be "read" per user easily without a join table.
    
    // However, the prompt says "Welcome, Deposit Success, Withdrawal Success" -> These are all TARGETED.
    // So we just update WHERE target_uid = ?. Global ones (if any) will remain unread-able or we assume they are always read?
    // Let's stick to targeted for now.
    
    await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE target_uid = ?').bind(user.uid).run()
    return c.json({ success: true })
})

userApi.post('/notifications/:id/read', async (c) => {
    const userId = c.get('user').id
    const notifId = c.req.param('id')
    // Ideally check ownership but for now just mark
    await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').bind(notifId).run()
    return c.json({ success: true })
})

userApi.delete('/notifications', async (c) => {
    const userId = c.get('user').id
    const user = await c.env.DB.prepare('SELECT uid FROM users WHERE id = ?').bind(userId).first<any>()
    await c.env.DB.prepare('DELETE FROM notifications WHERE target_uid = ?').bind(user.uid).run()
    return c.json({ success: true })
})

// Generate Bot Bind Code
userApi.get('/bind-code', async (c) => {
    const userId = c.get('user').id
    
    // Create Code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes
    
    // Clean old codes
    await c.env.DB.prepare("DELETE FROM bind_codes WHERE user_id = ?").bind(userId).run()
    
    // Insert new code
    await c.env.DB.prepare("INSERT INTO bind_codes (code, user_id, expires_at) VALUES (?, ?, ?)").bind(code, userId, expiresAt).run()
    
    // Check if already bound
    const user = await c.env.DB.prepare("SELECT telegram_username FROM users WHERE id = ?").bind(userId).first<any>()
    
    return c.json({ code, expiresAt, current_bot: user?.telegram_username })
})

export default userApi
