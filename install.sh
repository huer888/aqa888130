#!/bin/bash

echo "🚀 Starting Stake Parceiros Installation..."

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v20 first."
    echo "   Command: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

echo "✅ Node.js found: $(node -v)"

# 2. Install Dependencies
echo "📦 Installing project dependencies..."
npm install

# 2.1 Build Frontend
echo "🏗️  Building frontend assets..."
npm run build:client

# 3. Setup Environment
if [ ! -f .env ]; then
    echo "⚙️  Configuring environment variables..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it if you need to change ports or keys."
else
    echo "ℹ️  .env file already exists. Skipping."
fi

# 4. Start Application
echo "🚀 Starting application with PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 global process manager..."
    npm install -g pm2
fi

pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

echo "=================================================="
echo "✅ Installation Complete!"
echo "🌐 Your website should be running on port 3000"
echo "   (Frontend + Backend are now served on the same port)"
echo "📝 Admin Panel: http://your-ip:3000/admin"
echo "=================================================="
