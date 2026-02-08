
import 'dotenv/config';

const API_KEY = "244533-KG7TshXWJYPVVd";
const BASE_URL = "https://api.b365api.com/v1/bet365/upcoming";

async function testApi() {
    console.log('🔍 Testing BetsAPI Connection...');
    console.log(`🔑 Key: ${API_KEY}`);
    
    try {
        const url = `${BASE_URL}?sport_id=1&token=${API_KEY}&page=1`;
        console.log(`🌐 Fetching: ${url}`);
        
        const res = await fetch(url);
        console.log(`📡 Status: ${res.status}`);
        
        if (res.status !== 200) {
            console.error('❌ API Request Failed');
            const text = await res.text();
            console.error('   Body:', text);
            return;
        }

        const data = await res.json();
        
        if (data.success === 0) {
             console.error('❌ API Error (Logical):', data.error);
             return;
        }

        console.log('✅ API Success!');
        console.log(`📊 Total Matches Found: ${data.pager?.total}`);
        
        if (data.results && data.results.length > 0) {
            console.log('📝 First 3 Matches:');
            data.results.slice(0, 3).forEach((m: any) => {
                console.log(`   - [${m.time}] ${m.home.name} vs ${m.away.name} (${m.league.name})`);
            });
        } else {
            console.warn('⚠️ No results in first page.');
        }

    } catch (e) {
        console.error('❌ Exception:', e);
    }
}

testApi();
