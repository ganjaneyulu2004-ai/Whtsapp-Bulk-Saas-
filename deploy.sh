#!/bin/bash
# ================================================================
# 🚀 OfferBlast SaaS - One-Click Automated Deployment Script
# Usage on VPS: ./deploy.sh
# ================================================================

set -e

echo ""
echo "=========================================================="
echo "  🚀 Starting OfferBlast Production Deployment...        "
echo "=========================================================="

# 1. Pull latest code from GitHub
echo "📥 [1/4] Pulling latest updates from GitHub..."
git pull origin main

# 2. Install any new dependencies
echo "📦 [2/4] Installing dependencies..."
npm install --prefer-offline --no-audit

# 3. Build the application and sync database schema
echo "🔨 [3/4] Building Next.js application & syncing Prisma DB..."
npm run build

# 4. Restart or start PM2 process
echo "🔄 [4/4] Reloading PM2 production server (Zero Downtime)..."
if pm2 describe offerblast > /dev/null 2>&1; then
    pm2 reload offerblast
else
    pm2 start npm --name "offerblast" -- start
fi

# Save PM2 process list so it automatically restarts on server reboot
pm2 save

echo ""
echo "=========================================================="
echo "  ✅ Deployment Complete! OfferBlast is Live & Running!   "
echo "=========================================================="
echo ""
