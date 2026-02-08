# Stake Partner System - Production Package
# 包含完整数据和配置

1. 解压文件:
   unzip zuizhong.zip -d webapp
   cd webapp

2. 运行一键部署脚本:
   ./deploy_start.sh

3. 手动运行 (如果脚本失败):
   npm install
   npm run build:client
   npm run start

注意: 
- 数据库文件: local.sqlite (包含所有用户数据)
- 配置文件: .env (包含API Key)
