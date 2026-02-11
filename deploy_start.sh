#!/bin/bash

# One-Click Deployment Script for Stake Partner System
# 一键部署脚本

echo "=================================================="
echo "   Stake Partner System - Auto Deploy"
echo "=================================================="

# 1. Install Dependencies
echo "📦 Installing system dependencies..."
if [ -f "package.json" ]; then
    npm install
else
    echo "❌ Error: package.json not found!"
    exit 1
fi

# 2. Build Frontend
echo "🏗️  Building frontend assets..."
npm run build:client

# 3. Check Database
echo "🗄️  Checking database..."
if [ ! -f "local.sqlite" ]; then
    echo "⚠️  No database found. Creating new one..."
    npx tsx src/init-db.ts
else
    echo "✅ Database found. Applying any pending migrations..."
    npx tsx src/init-db.ts
fi

# 4. Start Server
echo "🚀 Starting server..."
echo "   Server will run on port defined in .env (default: 3001)"

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo "   Using PM2 for process management..."
    pm2 delete webapp 2>/dev/null || true
    pm2 start src/run-server.ts --name webapp --interpreter ./node_modules/.bin/tsx
    pm2 save
    pm2 logs webapp --lines 20
else
    echo "   PM2 not found. Running with standard npm start..."
    npm run start
fi
