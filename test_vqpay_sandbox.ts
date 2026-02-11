import { createHash } from 'crypto';

// Sandbox Credentials
const config = {
    API_URL: "https://api.vqpay-sandbox.com",
    APP_ID: "sp1657803106840350720m",
    SECRET_PAY: "XUWBR4QQ8D66OUFCQY37VMSHH8ZAOKIH",
    MERCHANT_NO: "BC600069"
};

// MD5 Signature Function (Same as in project)
function sign(data: Record<string, any>, key: string): string {
    const sortedKeys = Object.keys(data)
        .filter(k => k !== 'signature' && k !== 'payer' && k !== 'payee' && data[k] !== null && data[k] !== undefined && data[k] !== '')
        .sort();
    
    const signStr = sortedKeys.map(k => `${k}=${data[k]}`).join('&') + `&key=${key}`;
    console.log('Sign String:', signStr);
    return createHash('md5').update(signStr, 'utf8').digest('hex').toUpperCase();
}

async function runTest() {
    const orderId = `TEST_DEP_${Date.now()}`;
    const amount = "100.00"; // Integers for some regions, floats for others. Docs said "10.00".

    const payload = {
        merchant_no: config.MERCHANT_NO,
        data: {
            country: "BR",
            currency: "BRL",
            payment_method_id: "PIX",
            payment_method_flow: "DIRECT", // Testing DIRECT flow
            order_id: orderId,
            amount: amount,
            notification_url: "https://google.com", // Mock URL
            success_redirect_url: "https://google.com",
            timestamp: Date.now(),
            payer: {
                name: "Sandbox Test User",
                email: "test@sandbox.com",
                document: "03382920980" // Valid CPF format usually needed
            }
        }
    };

    // Sign the payload
    // @ts-ignore
    payload.data.signature = sign(payload.data, config.SECRET_PAY);

    console.log('Sending Payload:', JSON.stringify(payload, null, 2));

    try {
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
        });

        const text = await resp.text();
        console.log('---------------------------------------------------');
        console.log('Response Status:', resp.status);
        console.log('Response Body:', text);
        console.log('---------------------------------------------------');

        try {
            const json = JSON.parse(text);
            if (json.state === 'ok') {
                console.log('SUCCESS! Analyzing Data Fields:');
                console.log(Object.keys(json.data));
                
                // Check for potential QR codes
                const possibleKeys = ['emv', 'payload', 'qr_code', 'qrcode', 'pay_code', 'code'];
                possibleKeys.forEach(key => {
                    if (json.data[key]) console.log(`Found [${key}]:`, json.data[key]);
                });

                // Deep scan
                 const values = Object.values(json.data);
                for (const val of values) {
                    if (typeof val === 'string' && val.startsWith('000201')) {
                        console.log('Found PIX string (starts with 000201) in values:', val);
                    }
                }
            }
        } catch (e) {
            console.error('Failed to parse JSON response');
        }

    } catch (error) {
        console.error('Request Failed:', error);
    }
}

runTest();
