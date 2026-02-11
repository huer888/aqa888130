import { createHash } from 'crypto';

// Configuration (Production)
const CONFIG = {
    API_URL: "https://api.vortaqpay.com", // Production URL
    MERCHANT_NO: "BC101428",
    APP_ID: "sp2017234877044363264m",
    SECRET_PAY: "OBA7XU8JR8CX3CSYV1OBUWGAUE0TE8CS"
};

// Signature Function
function sign(data: Record<string, any>, key: string): string {
    const sortedKeys = Object.keys(data)
        .filter(k => k !== 'signature' && k !== 'payer' && k !== 'payee' && data[k] !== null && data[k] !== undefined && data[k] !== '')
        .sort();
    
    const signStr = sortedKeys.map(k => `${k}=${data[k]}`).join('&') + `&key=${key}`;
    console.log('\n[Debug] Sign String:', signStr);
    return createHash('md5').update(signStr, 'utf8').digest('hex').toUpperCase();
}

async function testDeposit() {
    console.log('>>> Starting Production Diagnosis...');
    console.log('Target URL:', CONFIG.API_URL);

    const orderId = `TEST_${Date.now()}`;
    const payload = {
        merchant_no: CONFIG.MERCHANT_NO,
        data: {
            country: "BR",
            currency: "BRL",
            payment_method_id: "PIX",
            payment_method_flow: "DIRECT",
            order_id: orderId,
            amount: "10.00",
            notification_url: "https://google.com", // Using Google as dummy valid URL to rule out localhost issues
            success_redirect_url: "https://google.com",
            timestamp: Date.now(),
            payer: {
                name: "Debug User",
                email: "debug@test.com",
                document: "03382920980" // Valid Test CPF
            }
        }
    };

    // Sign
    // @ts-ignore
    payload.data.signature = sign(payload.data, CONFIG.SECRET_PAY);
    
    console.log('[Debug] Payload:', JSON.stringify(payload, null, 2));

    try {
        console.log(`\n-----------------------------------`);
        console.log(`TEST 1: IP CHECK (${CONFIG.API_URL})`);
        
        const resp = await fetch(`${CONFIG.API_URL}/api/pay/payment`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "ApiVersion": "1.0",
                "AppId": CONFIG.APP_ID,
                "Noncestr": Math.random().toString(36).substring(7),
                "Timestamp": String(Date.now())
            },
            body: JSON.stringify(payload)
        });

        console.log('Response Status:', resp.status);
        const text = await resp.text();
        console.log('Response Body:', text);
        
        // Check for specific IP
        if (text.includes("ILLEGAL_IP")) {
             const match = text.match(/ILLEGAL_IP:\[(.*?)\]/);
             if (match) {
                 console.log(`\n⚠️  CRITICAL: Gateway sees your IP as: ${match[1]}`);
                 console.log(`    Please verify this EXACT IP is in the whitelist.`);
             }
        }

    } catch (e: any) {
        console.error('\n❌ NETWORK ERROR:', e.message);
    }
}

testDeposit();
