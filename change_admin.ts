import Database from 'better-sqlite3'
import { hashSync } from 'bcryptjs'

const db = new Database('local.sqlite')
const newEmail = 'aqa888130'
const newPass = 'Yes20080808'
const hashedPassword = hashSync(newPass, 10)

try {
    // 尝试更新现有的管理员 (role='admin' 或 email='admin@betmaster.br')
    const updateStmt = db.prepare("UPDATE users SET email = ?, password = ? WHERE role = 'admin' OR email = 'admin@betmaster.br'")
    const info = updateStmt.run(newEmail, hashedPassword)

    if (info.changes > 0) {
        console.log('=============================================')
        console.log('✅ 管理员账号修改成功！')
        console.log('👤 新账号 (Email):', newEmail)
        console.log('🔑 新密码:', newPass)
        console.log('=============================================')
    } else {
        // 如果没找到，就插入一个新的
        console.log('⚠️ 未找到管理员账号，正在创建新的...')
        const insertStmt = db.prepare(`
            INSERT INTO users (email, password, name, role, invite_code, uid, commission_rate, balance, kyc_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        insertStmt.run(
            newEmail, 
            hashedPassword, 
            'Super Admin', 
            'admin', 
            '998877', 
            '99887766', 
            0.07, 
            10000.00,
            'verified'
        )
        console.log('=============================================')
        console.log('✅ 新管理员账号创建成功！')
        console.log('👤 账号 (Email):', newEmail)
        console.log('🔑 密码:', newPass)
        console.log('=============================================')
    }
} catch (error) {
    console.error('❌ 操作失败:', error)
}
