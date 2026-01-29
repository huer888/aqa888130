import { Hono } from 'hono'
import Database from 'better-sqlite3'
import { hashSync, compareSync } from 'bcryptjs'

const db = new Database('local.sqlite')

// 1. 模拟当前前端代码的逻辑 (Admin.tsx L51)
console.log('--- 测试 1: 模拟当前前端写死的账号登录 (admin@betmaster.br) ---')
const hardcodedUser = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@betmaster.br') as any
if (!hardcodedUser) {
    console.log('❌ 失败: 数据库里找不到 admin@betmaster.br (这就是为什么前端报错!)')
} else {
    const valid = compareSync('admin123', hardcodedUser.password)
    console.log(valid ? '✅ 成功' : '❌ 失败: 密码错误')
}

// 2. 模拟用户修改后的账号登录 (aqa888130)
console.log('\n--- 测试 2: 模拟用户的新账号登录 (aqa888130) ---')
const newUser = db.prepare('SELECT * FROM users WHERE email = ?').get('aqa888130') as any
if (!newUser) {
    console.log('❌ 失败: 数据库里找不到 aqa888130')
} else {
    const valid = compareSync('Yes20080808', newUser.password)
    console.log(valid ? '✅ 成功: 新账号密码正确，但前端代码没用它!' : '❌ 失败: 密码错误')
}
