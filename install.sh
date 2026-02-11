#!/bin/bash

# ==========================================
# Stake Auto-Deployment Script (v2.0 Final)
# ==========================================

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}>>> Starting Stake Auto-Deployment...${NC}"

# 1. Environment Check
echo -e "${YELLOW}[1/5] Checking Environment...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js v18 or higher: https://nodejs.org/"
    exit 1
fi

NODE_VER=$(node -v)
echo "Node Version: $NODE_VER"

# 2. Clean & Install Dependencies
echo -e "${YELLOW}[2/5] Installing Dependencies (this may take a minute)...${NC}"
# Remove potential conflict folders if they exist from a bad copy
rm -rf node_modules
# Install fresh
npm install --production=false

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: npm install failed.${NC}"
    exit 1
fi

# Build Client & Server
echo -e "${YELLOW}[2.5/5] Building Project...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: npm build failed.${NC}"
    exit 1
fi

# Rebuild native modules (Fixes 'better-sqlite3' errors on different OS)
echo "Rebuilding database drivers..."
npm rebuild better-sqlite3

# 3. Setup Process Manager (PM2)
echo -e "${YELLOW}[3/5] Setting up Process Manager (PM2)...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2 globally..."
    npm install -g pm2
    
    # If global install fails (permission), try local
    if [ $? -ne 0 ]; then
        echo "Global install failed, using local npx..."
        PM2_CMD="npx pm2"
    else
        PM2_CMD="pm2"
    fi
else
    PM2_CMD="pm2"
fi

# 4. Process Management
echo -e "${YELLOW}[4/5] Starting Server...${NC}"

# Stop existing if running
$PM2_CMD delete stake-server 2>/dev/null || true

# Start new instance
# We use the 'start' script from package.json
$PM2_CMD start npm --name "stake-server" -- run start

# Save list
$PM2_CMD save

# 5. Verification
echo -e "${YELLOW}[5/5] Verifying Deployment...${NC}"
sleep 3 # Wait for boot

# Check if running
if $PM2_CMD list | grep -q "stake-server"; then
    echo -e "${GREEN}==============================================${NC}"
    echo -e "${GREEN} SUCCESS! Application is running.${NC}"
    echo -e "${GREEN}==============================================${NC}"
    echo -e "Access your website at: http://localhost:3000"
    echo -e "To view logs, run: ${YELLOW}pm2 logs stake-server${NC}"
    echo -e "To stop, run: ${YELLOW}pm2 stop stake-server${NC}"
else
    echo -e "${RED}Error: Server failed to start.${NC}"
    $PM2_CMD logs stake-server --lines 20
fi
