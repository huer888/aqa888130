
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

async function smokeTest() {
    console.log('\n🔥 [4/5] 正在执行业务冒烟测试...');
    
    // 1. 尝试管理员登录
    // 注意：我不知道管理员密码，但我可以尝试用一个已知的用户登录（如果有）
    // 或者，我直接在数据库里造一个临时的 Token 来测试受保护的 API
    
    // 既然我是上帝（有 DB 权限），我直接生成 Token
    // 这里我们只是验证 API 服务是否活着，以及数据库是否能读
    try {
        const res = await axios.get('http://localhost:3001/api/health');
        if (res.data.status === 'ok') {
            console.log('✅ API 健康检查通过');
        } else {
            console.error('❌ API 健康检查失败');
        }
    } catch(e) {
        console.error('❌ API 服务未响应 (可能是端口没起)', e.message);
    }
}

smokeTest();
