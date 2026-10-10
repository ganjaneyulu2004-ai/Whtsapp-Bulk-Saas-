#!/bin/bash
# ================================================================
# ⚙️ OfferBlast SaaS - Initial VPS Setup Script (Ubuntu 22.04 / 24.04)
# Run once on your new Hostinger VPS: bash scripts/vps-setup.sh
# ================================================================

set -e

echo ""
echo "=========================================================="
echo "  🚀 Starting Initial VPS Environment Setup...           "
echo "=========================================================="

# 1. Update system packages
echo "🔄 [1/6] Updating system packages..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx software-properties-common

# 2. Install Node.js 20 LTS & PM2
echo "📦 [2/6] Installing Node.js 20 LTS and PM2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 3. Install & Start PostgreSQL
echo "🗄️ [3/6] Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and user if not exists
DB_NAME="offerblast_db"
DB_USER="offerblast_user"
DB_PASS="OfferBlastPass2026Secure!"

echo "🔑 Configuring PostgreSQL database '$DB_NAME'..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

# 4. Install Certbot for Free SSL
echo "🔒 [4/6] Installing Certbot for HTTPS / SSL..."
sudo apt install -y certbot python3-certbot-nginx

# 5. Configure Firewall
echo "🛡️ [5/6] Configuring UFW Firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 6. Make deploy.sh executable
echo "⚙️ [6/6] Finalizing permissions..."
chmod +x deploy.sh 2>/dev/null || true

echo ""
echo "=========================================================="
echo "  ✅ Initial VPS Setup Complete!                          "
echo "=========================================================="
echo "Database URL for your .env:"
echo "DATABASE_URL=\"postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME\""
echo "=========================================================="
echo ""
