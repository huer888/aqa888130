#!/bin/bash

# One-Click Deployment Script (Fast Version)
# 快速部署脚本 (跳过构建)

echo "=================================================="
echo "   Stake Partner System - Fast Deploy"
echo "=================================================="

# 1. Install Dependencies
echo "📦 Installing system dependencies..."
if [ -f "package.json" ]; then
    npm install
else
    echo "❌ Error: package.json not found!"
    exit 1
fi

# 2. Check Database
echo "🗄️  Checking database..."
if [ ! -f "local.sqlite" ]; then
    echo "⚠️  No database found. Creating new one..."
    npx tsx src/init-db.ts
else
    echo "✅ Database found. Applying any pending migrations..."
    npx tsx src/init-db.ts
fi

# 3. Start Server
echo "🚀 Starting server..."
# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    pm2 delete webapp 2>/dev/null || true
    pm2 start src/run-server.ts --name webapp --interpreter ./node_modules/.bin/tsx
    pm2 save
    echo "✅ Server started with PM2!"
else
    echo "⚠️ PM2 not found. Installing global PM2..."
    npm install -g pm2
    pm2 start src/run-server.ts --name webapp --interpreter ./node_modules/.bin/tsx
    echo "✅ Server started!"
fi
