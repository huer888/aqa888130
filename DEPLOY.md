# Stake Parceiros - Deployment Guide (Foolproof)

This package contains the **Full System Snapshot** (Frontend, Backend, Database).
Follow these steps to restore the system on your server.

## 📋 System Requirements
- **OS**: Linux (Ubuntu 20.04/22.04 recommended, CentOS, Debian)
- **Node.js**: v20.x (Important: Must use version 20 for compatibility)

---

## 🚀 Step 1: Upload & Unzip
1. Login to your **Baota Panel** (or SSH).
2. Create a folder (e.g., `/www/wwwroot/stake-game`).
3. Upload `stake-parceiros-full.zip` to that folder.
4. **Unzip** the file.

## ⚡ Step 2: One-Click Install
1. Open the **Terminal** in that directory.
2. Run the following command:
   ```bash
   bash install.sh
   ```
3. Wait for the script to finish. It will:
   - Check your environment.
   - Install all necessary libraries (node_modules).
   - Configure the secret keys.
   - Start the server automatically.

## 🌐 Step 3: Configure Domain (Reverse Proxy)
1. Go to **Baota Panel > Websites**.
2. Add your domain (e.g., `painel.yourdomain.com`).
3. Go to **Settings > Reverse Proxy**.
4. Add Proxy:
   - **Target URL**: `http://127.0.0.1:3000`
   - **Sent Domain**: `$host`

---

## 🔐 Credentials (Restored from Backup)
The database is fully restored. Use your existing accounts:

- **Admin Login**: `admin@betmaster.br` / `admin123`
- **Alternative Admin**: `aqa888130` / `Yes20080808`

## 🛠 Troubleshooting
- **If the site doesn't load**: Check if Port 3000 is allowed in your server firewall (Security Group).
- **If you see database errors**: The `local.sqlite` file is included. Ensure permissions are correct (`chmod 777 local.sqlite`).
