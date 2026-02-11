部署修复说明 (Deployment Fix Instructions)

您的项目在宝塔 (Baota/aaPanel) 上无法打开前端的主要原因是：
The main reason your project isn't working on Baota is:

1. **依赖缺失 (Missing Dependency):** 运行服务器所需的 `tsx` 工具被放在了 `devDependencies` 中。生产环境安装 (Production install) 会跳过它，导致服务器无法启动。
   The `tsx` tool required to run the server was in `devDependencies`. Production installs skip this, causing the server to fail to start.

2. **构建文件可能缺失 (Build Files Might Be Missing):** 前端必须在服务器上运行 `build` 命令生成 `dist` 目录。
   The frontend must be built on the server to generate the `dist` directory.

---

### 修复步骤 (Fix Steps)

我已经修改了 `package.json`，将 `tsx` 移到了 `dependencies`。请按照以下步骤重新部署：
I have updated `package.json` to move `tsx` to `dependencies`. Please follow these steps:

#### 第一步：上传代码 (Step 1: Upload Code)
下载此修复后的压缩包，上传到宝塔服务器并解压。
Download this fixed zip, upload to Baota, and unzip.

#### 第二步：安装依赖 (Step 2: Install Dependencies)
在宝塔终端中进入项目目录，运行：
Enter the project directory in the terminal and run:

```bash
# 务必删除旧的 node_modules 以防万一
rm -rf node_modules

# 安装所有依赖
npm install
```

#### 第三步：构建前端 (Step 3: Build Frontend)
**非常重要！** 这一步会生成前端页面文件。
**Very Important!** This step generates the frontend files.

```bash
npm run build
```

*如果报错提示 vite not found，请运行 `npm install --include=dev`*
*If you see "vite not found", run `npm install --include=dev`*

#### 第四步：启动项目 (Step 4: Start Project)

**方式 A：使用宝塔 Node.js 项目管理器 (Method A: Baota Node Manager)**
- 启动脚本 (Start Command): `npm start`
- 运行目录 (Run Directory): 选择项目根目录

**方式 B：使用 PM2 (Method B: Using PM2)**
直接在终端运行：
```bash
pm2 start ecosystem.config.cjs
pm2 save
```

---

### 常见问题排查 (Troubleshooting)

1. **如果显示 "UI not built":**
   说明你跳过了第三步 (`npm run build`)，或者 `dist` 目录不存在。
   (Means you skipped Step 3 or dist directory is missing.)

2. **如果显示 "502 Bad Gateway":**
   说明后端没启动。检查端口是否冲突。
   - 您的代码默认使用端口 **3000**。
   - 请确保宝塔的安全组/防火墙放行了 3000 端口 (如果你直接访问)。
   - 如果使用 Nginx 反向代理，确保代理指向 `http://127.0.0.1:3000`。

3. **如果端口被占用 (EADDRINUSE):**
   修改 `package.json` 中的启动命令，例如指定端口：
   `"start": "PORT=3005 tsx src/run-server.ts"`
