=== Stake Parceiros - Final Production Build ===

部署指南 (Deployment Guide):

1. 环境要求 (Requirements):
   - Node.js v18+ 
   - NPM

2. 安装依赖 (Install Dependencies):
   npm install

3. 启动服务 (Start Service):
   npm run start

   * 前端已构建在 dist/ 目录，无需再次构建。
   * 服务启动后，访问 http://localhost:3000 (或您的服务器IP) 即可。

4. 管理员账号 (Admin Account):
   - 账号: aqa888130
   - 密码: qq123456

5. 机器人配置 (Bot Config):
   - 您的机器人 Token 和群组 ID 已保存在 src/config.ts 和数据库中。
   - 如需修改，请登录后台 -> 机器人管理 -> 系统配置。

6. 维护工具 (Tools):
   - 如果需要重置管理员密码，可以使用我们保留的脚本 (需先安装 tsx):
     npx tsx reset_admin_password.ts

祝运营顺利！
