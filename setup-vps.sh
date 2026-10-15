#!/bin/bash
# ==============================================================================
# 🚀 Hostinger KVM VPS - Automated 1-Click Setup for OfferBlast WhatsApp SaaS
# Usage on Ubuntu 22.04 / 24.04:
#   curl -sSL https://raw.githubusercontent.com/ganjaneyulu2004-ai/Whtsapp-Bulk-Saas-/main/setup-vps.sh | bash -s yourdomain.com
# ==============================================================================

set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "⚠️ Please provide your domain name!"
    echo "Usage: ./setup-vps.sh yourdomain.com"
    read -p "Enter your Domain name (e.g. offerblast.in): " DOMAIN
fi

echo ""
echo "=========================================================="
echo "  🚀 Starting Setup for domain: $DOMAIN on Hostinger VPS  "
echo "=========================================================="
echo ""

# 1. Update OS Packages
echo "🔄 [1/7] Updating system packages..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git ufw nginx postgresql postgresql-contrib

# 2. Install Node.js 20 LTS
echo "📦 [2/7] Installing Node.js 20 LTS & PM2..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
npm install -g pm2

# 3. Configure PostgreSQL Database
echo "🗄️ [3/7] Configuring PostgreSQL database..."
systemctl start postgresql
systemctl enable postgresql

DB_NAME="offerblast"
DB_USER="offeruser"
DB_PASS="OfferBlastPass2026Secure!"

sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
sudo -u postgres psql -c "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;"

# 4. Clone or Pull Application Repository
echo "📥 [4/7] Fetching OfferBlast code from GitHub..."
APP_DIR="/var/www/offerblast"
mkdir -p /var/www

if [ -d "$APP_DIR/.git" ]; then
    cd $APP_DIR
    git pull origin main
else
    git clone https://github.com/ganjaneyulu2004-ai/Whtsapp-Bulk-Saas-.git $APP_DIR
    cd $APP_DIR
fi

# 5. Create Production .env file
echo "⚙️ [5/7] Creating production .env file..."
if [ -f "$APP_DIR/.env.production" ]; then
    cp "$APP_DIR/.env.production" "$APP_DIR/.env"
else
    touch "$APP_DIR/.env"
fi

# Set DATABASE_URL and NEXTAUTH_URL dynamically
sed -i '/DATABASE_URL=/d' "$APP_DIR/.env" || true
sed -i '/NEXTAUTH_URL=/d' "$APP_DIR/.env" || true

echo "DATABASE_URL=\"postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public\"" >> "$APP_DIR/.env"
echo "NEXTAUTH_URL=\"https://$DOMAIN\"" >> "$APP_DIR/.env"

# 6. Install dependencies and Build Next.js
echo "🔨 [6/7] Installing dependencies & Building SaaS..."
npm install
npx prisma generate
npx prisma db push --accept-data-loss
npm run build

# Start or reload PM2
if pm2 describe offerblast > /dev/null 2>&1; then
    pm2 reload offerblast
else
    pm2 start npm --name "offerblast" -- start
fi
pm2 save
pm2 startup systemd -u root --hp /root || true

# 7. Configure Nginx Reverse Proxy
echo "🌐 [7/7] Configuring Nginx Web Server..."
cat <<EOF > /etc/nginx/sites-available/offerblast
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/offerblast /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# 8. Setup SSL with Certbot
echo "🔒 Setting up Free SSL with Certbot..."
apt-get install -y certbot python3-certbot-nginx
certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email -d $DOMAIN -d www.$DOMAIN || echo "⚠️ SSL automated registration will succeed once DNS propagation completes."

echo ""
echo "=========================================================="
echo "  🎉 SUCCESS! Your WhatsApp Bulk SaaS is Live!            "
echo "  🌐 Domain: http://$DOMAIN (or https://$DOMAIN)          "
echo "=========================================================="
echo ""
