# Stake Partner System - Production Package (Pre-Built)
# 包含完整数据、配置 和 已编译的前端

1. 解压覆盖:
   unzip -o zuizhong.zip
   cd webapp

2. 快速重启 (无需编译):
   ./deploy_fast.sh

3. 如果仍然白屏:
   请检查宝塔面板 -> 网站 -> 反向代理 配置是否指向 http://127.0.0.1:3001
   并尝试在浏览器清除缓存 (Ctrl+Shift+R)
