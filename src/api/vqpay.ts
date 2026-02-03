import { Hono } from 'hono'
import { Bindings } from '../bindings'
import { authMiddleware } from '../middleware'
import { createHash } from 'crypto'

const vqpay = new Hono<{ Bindings: Bindings, Variables: { user: any } }>()

// Configuration
function getConfig(c: any) {
    return {
        APP_ID: c.env.VQPAY_APP_ID || "sp2017234877044363264m",
        SECRET_PAY: c.env.VQPAY_SECRET_PAY || "OBA7XU8JR8CX3CSYV1OBUWGAUE0TE8CS",
        SECRET_SETTLE: c.env.VQPAY_SECRET_SETTLE || "PHNPMM4HYBSFYBTB9EFOSDVBS1EE9GNS",
        API_URL: c.env.VQPAY_API_URL || "https://api.vortaqpay.com",
        MERCHANT_NO: "BC101428"
    }
}

// MD5 Signature
function sign(data: Record<string, any>, key: string): string {
    const sortedKeys = Object.keys(data)
        .filter(k => k !== 'signature' && k !== 'payer' && k !== 'payee' && data[k] !== null && data[k] !== undefined && data[k] !== '')
        .sort()
    
    const signStr = sortedKeys.map(k => `${k}=${data[k]}`).join('&') + `&key=${key}`
    // console.log('Sign Str:', signStr) // Debug
    return createHash('md5').update(signStr, 'utf8').digest('hex').toUpperCase()
}

// 1. Initiate Payment (Deposit)
vqpay.post('/pay', authMiddleware, async (c) => {
    console.log('[VQPay] /pay request started')
    try {
        const user = c.get('user')
        console.log('[VQPay] User:', user.id)
        const body = await c.req.json()
        console.log('[VQPay] Body:', body)
        const { amount, payment_method_id = 'PIX' } = body
        const config = getConfig(c)
        
        if (!amount || amount <= 0) return c.json({ error: 'Invalid amount' }, 400)

        // Generate Order ID
        const orderId = `DEP_${Date.now()}_${user.id}`
        
        // --- NOTIFICATION URL LOGIC ---
        // Critical for Production: Must be a valid public URL.
        // We prioritize the host header, but if it's localhost, we fallback to a placeholder
        // or the user's public IP if known.
        
        let origin = 'http://45.145.73.138:3000' // Default to your server IP
        
        try {
            const host = c.req.header('host')
            // For production, we trust the host header if it's not localhost
            // We also handle potential port issues if behind proxy
            if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
                 const protocol = c.req.header('x-forwarded-proto') || 'http'
                 origin = `${protocol}://${host}`
            }
        } catch (e) {}
        
        const notifyUrl = `${origin}/api/vqpay/notify/pay`
        console.log('[VQPay] Using Notify URL:', notifyUrl)
        
        const payload = {
            merchant_no: config.MERCHANT_NO,
            data: {
                country: "BR",
                currency: "BRL",
                payment_method_id: payment_method_id,
                payment_method_flow: "DIRECT", 
                order_id: orderId,
                amount: Number(amount).toFixed(2),
                notification_url: notifyUrl,
                success_redirect_url: origin, // Redirect back to home
                timestamp: Date.now(),
                payer: {
                    name: user.name || "Test User",
                    email: user.email || "test@example.com",
                    document: user.cpf || "03382920980"
                }
            }
        }

        console.log('[VQPay] Payload created, signing...')

        // Sign
        // @ts-ignore
        payload.data.signature = sign(payload.data, config.SECRET_PAY)
        
        console.log('[VQPay] Signed. Fetching...', `${config.API_URL}/api/pay/payment`)

        const resp = await fetch(`${config.API_URL}/api/pay/payment`, {
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

        console.log('[VQPay] Fetch status:', resp.status)
        const text = await resp.text()
        console.log('[VQPay] Fetch response:', text)
        
        let result: any
        try {
            result = JSON.parse(text)
        } catch(e) {
            console.error('[VQPay] JSON Parse Error', e)
            return c.json({ error: 'Upstream Error' }, 502)
        }

        if (result.state === 'ok') {
            // Success: Create Pending Transaction
            await c.env.DB.prepare(`
                INSERT INTO transactions (user_id, type, amount, status, note, tx_hash, created_at)
                VALUES (?, 'deposit', ?, 'pending', ?, ?, CURRENT_TIMESTAMP)
            `).bind(user.id, amount, `VQPay Deposit: ${orderId}`, orderId).run()

            console.log('[VQPay] Transaction created for:', orderId)
            
            // Extract PIX code for DIRECT flow
            // Found via Sandbox: result.data.card.qr_code
            let pixCode = result.data.emv || result.data.payload || result.data.qr_code || result.data.qrcode || result.data.pay_code || (result.data.card && result.data.card.qr_code);
            
            if (!pixCode) {
                // Deep scan for PIX string (Recursive)
                const findPix = (obj: any): string | null => {
                    if (!obj || typeof obj !== 'object') return null;
                    for (const val of Object.values(obj)) {
                        if (typeof val === 'string' && val.startsWith('000201')) return val;
                        if (typeof val === 'object') {
                            const found = findPix(val);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                pixCode = findPix(result.data);
            }

            return c.json({ 
                success: true, 
                redirect_url: result.data.redirect_url, // Fallback
                qr_code: pixCode, // This triggers the native QR display in frontend
                order_id: orderId,
                payment_id: result.data.payment_id,
                debug_data: !pixCode ? result.data : undefined
            })
        } else {
            console.error('VQPay Error:', result)
            // Handle IP Errors specifically
            if (result.code == 105 || result.code == 106 || (result.msg && result.msg.includes('IP'))) {
                const ipError = `Gateway Error: Server IP (${c.req.header('cf-connecting-ip') || 'Unknown'}) not whitelisted (Code ${result.code})`;
                console.error(ipError);
                return c.json({ error: ipError, code: result.code }, 400);
            }
            return c.json({ error: result.msg || 'Payment initiation failed' }, 400)
        }

    } catch (e) {
        console.error('[VQPay] Crash:', e)
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

// 2. Deposit Callback
vqpay.post('/notify/pay', async (c) => {
    let data: any
    try {
        data = await c.req.json()
    } catch {
        data = await c.req.parseBody()
    }

    console.log('[VQPay Notify Payload]', data)

    const config = getConfig(c)
    
    // Verify Signature
    const incomingSig = data.signature
    const mySig = sign(data, config.SECRET_PAY)

    if (incomingSig !== mySig) {
        console.error('Signature Mismatch', incomingSig, mySig)
        // Docs say: "Please return SUCCESS in uppercase"
        // But if sig fails, maybe we shouldn't? But to stop retries...
        return c.text('FAIL', 400)
    }

    if (data.status === 'SUCCESS') {
        const orderId = data.order_id
        const amount = parseFloat(data.amount)
        
        // Find transaction
        const tx = await c.env.DB.prepare("SELECT * FROM transactions WHERE tx_hash = ? AND type = 'deposit'").bind(orderId).first<any>()
        
        if (tx && tx.status === 'pending') {
            // Update to success
            await c.env.DB.prepare("UPDATE transactions SET status = 'completed', tx_hash = ? WHERE id = ?").bind(data.payment_id, tx.id).run()
            
            // Add Balance
            await c.env.DB.prepare("UPDATE users SET balance = IFNULL(balance, 0) + ? WHERE id = ?").bind(amount, tx.user_id).run()
            
            console.log(`[VQPay] Deposit Confirmed: ${orderId} Amount: ${amount}`)
        }
    }

    return c.text('SUCCESS')
})

// 3. Initiate Settlement (Withdraw)
vqpay.post('/settle', authMiddleware, async (c) => {
    const user = c.get('user')
    const { amount, pin, account_type = "PIX", account_key, document } = await c.req.json()
    const config = getConfig(c)

    // Validate Balance & PIN (Reusing wallet logic simplified)
    const dbUser = await c.env.DB.prepare('SELECT balance, payment_pin FROM users WHERE id = ?').bind(user.id).first<any>()
    
    if (!dbUser.payment_pin || dbUser.payment_pin !== pin) {
        return c.json({ error: 'Invalid PIN' }, 400)
    }
    
    if ((dbUser.balance || 0) < amount) {
        return c.json({ error: 'Insufficient balance' }, 400)
    }

    const orderId = `WTH_${Date.now()}_${user.id}`
    let origin = 'http://45.145.73.138:3000'
    try {
        const host = c.req.header('host')
        if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
            const protocol = c.req.header('x-forwarded-proto') || 'http'
            origin = `${protocol}://${host}`
        }
    } catch (e) {
        console.warn('Could not determine origin, using default')
    }
    const notifyUrl = `${origin}/api/vqpay/notify/settle`

    // Determine Payee Account Type and Value
    // Brazil: PIX (account_type: CPF/PHONE/EMAIL/CHAVE)
    // Map internal type to VQPay type
    let vqAccountType = "CHAVE" // Default random key
    let vqAccount = account_key
    
    // Validate required fields based on type
    if (account_type === 'CPF') { 
        vqAccountType = 'CPF'; 
        if(!document) return c.json({ error: 'CPF is required' }, 400);
        vqAccount = document; 
    }
    else if (account_type === 'PHONE') { 
        vqAccountType = 'PHONE'; 
        vqAccount = account_key; // Phone number
    }
    else if (account_type === 'EMAIL') { 
        vqAccountType = 'EMAIL'; 
        vqAccount = account_key; // Email address
    } else {
        vqAccountType = 'CHAVE';
        vqAccount = account_key;
    }
    
    // Deduct Balance First (Lock funds)
    await c.env.DB.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").bind(amount, user.id).run()

    // Create Transaction
    const txRes = await c.env.DB.prepare(`
        INSERT INTO transactions (user_id, type, amount, status, note, tx_hash, created_at)
        VALUES (?, 'withdraw', ?, 'pending', ?, ?, CURRENT_TIMESTAMP)
    `).bind(user.id, amount, `VQPay Withdraw: ${orderId}`, orderId).run()

    const payload = {
        merchant_no: config.MERCHANT_NO,
        data: {
            country: "BR",
            currency: "BRL",
            order_id: orderId,
            amount: Number(amount).toFixed(2),
            notification_url: notifyUrl,
            timestamp: Date.now(),
            payee: {
                name: user.name || "User",
                account: vqAccount,
                account_type: vqAccountType,
                phone: vqAccountType === 'PHONE' ? vqAccount : undefined,
                email: vqAccountType === 'EMAIL' ? vqAccount : undefined,
                document: vqAccountType === 'CPF' ? vqAccount : "00000000000" // Always send document for BR?
            }
        }
    }
    
        // Check signature first
        // @ts-ignore
        payload.data.signature = sign(payload.data, config.SECRET_SETTLE)
        
        console.log('[VQPay Settle] Payload:', JSON.stringify(payload))

    try {
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

        console.log('[VQPay Settle] Fetch status:', resp.status)
        const text = await resp.text()
        console.log('[VQPay Settle] Response:', text)
        const result = JSON.parse(text)
        
        if (result.state === 'ok') {
            return c.json({ success: true, message: 'Withdrawal requested' })
        } else {
            // Refund on immediate API failure
            await c.env.DB.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").bind(amount, user.id).run()
            await c.env.DB.prepare("UPDATE transactions SET status = 'failed', note = ? WHERE id = ?").bind(`Failed: ${result.msg}`, txRes.meta.last_row_id).run()
            
            // Return more detailed error if available
            let errorMessage = result.errorMsg || result.msg || 'Withdrawal failed';
            
            // Handle IP Errors specifically for Withdraw
            if (result.code == 105 || result.code == 106 || (result.msg && result.msg.includes('IP'))) {
                 errorMessage = `Gateway Error: Server IP not whitelisted (Code ${result.code}). Please check merchant settings.`;
                 console.error('[VQPay Settle] IP Error:', errorMessage);
            }

            return c.json({ error: errorMessage }, 400)
        }
    } catch (e) {
        console.error(e)
        // Refund? Maybe not safe if we don't know if request went through.
        // But for safety in sandbox:
        await c.env.DB.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").bind(amount, user.id).run()
        await c.env.DB.prepare("UPDATE transactions SET status = 'failed' WHERE id = ?").bind(txRes.meta.last_row_id).run()
        return c.json({ error: 'Internal Error' }, 500)
    }
})

// 4. Settlement Callback
vqpay.post('/notify/settle', async (c) => {
    let data: any
    try {
        data = await c.req.json()
    } catch {
        data = await c.req.parseBody()
    }

    const config = getConfig(c)
    const incomingSig = data.signature
    const mySig = sign(data, config.SECRET_SETTLE) // Use Settle Secret

    if (incomingSig !== mySig) {
        return c.text('FAIL', 400)
    }

    const orderId = data.order_id
    const status = data.status // SUCCESS, FAIL, BACK

    const tx = await c.env.DB.prepare("SELECT * FROM transactions WHERE tx_hash = ? AND type = 'withdraw'").bind(orderId).first<any>()

    if (tx && tx.status === 'pending') {
        if (status === 'SUCCESS') {
            await c.env.DB.prepare("UPDATE transactions SET status = 'completed' WHERE id = ?").bind(tx.id).run()
        } else if (status === 'FAIL' || status === 'BACK') {
            // Refund
            await c.env.DB.prepare("UPDATE transactions SET status = 'failed' WHERE id = ?").bind(tx.id).run()
            await c.env.DB.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").bind(tx.amount, tx.user_id).run()
        }
    }

    return c.text('SUCCESS')
})

export default vqpay