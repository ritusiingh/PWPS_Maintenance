#!/bin/bash
# =============================================================================
# OCI (Oracle Cloud Infrastructure) Deployment Script
# Apartment Maintenance Calculator
# =============================================================================
# 
# Prerequisites:
#   1. OCI Compute instance (Ubuntu 22.04+ recommended, min 2 OCPU / 4GB RAM)
#   2. SSH access to the instance
#   3. Security list: open ports 80, 443, 22
#   4. Domain name pointed to instance public IP (optional but recommended)
#
# Usage:
#   1. SSH into your OCI instance
#   2. Copy this project to the server
#   3. Run: chmod +x deploy/oci-deploy.sh && ./deploy/oci-deploy.sh
# =============================================================================

set -e

echo "============================================"
echo "  Apartment Maintenance Calculator"
echo "  OCI Deployment Script"
echo "============================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# --- Step 1: System updates ---
log "Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# --- Step 2: Install Node.js 20 ---
log "Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
node -v
npm -v

# --- Step 3: Install build essentials (for better-sqlite3) ---
log "Installing build tools..."
sudo apt-get install -y build-essential python3 git

# --- Step 4: Install Nginx ---
log "Installing Nginx..."
sudo apt-get install -y nginx
sudo systemctl enable nginx

# --- Step 5: Install Certbot for SSL (optional) ---
log "Installing Certbot..."
sudo apt-get install -y certbot python3-certbot-nginx || warn "Certbot install failed - SSL setup optional"

# --- Step 6: Setup application directory ---
APP_DIR="/opt/apartment-maintenance"
log "Setting up application at ${APP_DIR}..."

sudo mkdir -p ${APP_DIR}
sudo cp -r . ${APP_DIR}/
sudo chown -R $USER:$USER ${APP_DIR}
cd ${APP_DIR}

# --- Step 7: Install dependencies ---
log "Installing server dependencies..."
npm install --production

log "Installing client dependencies..."
cd client
npm install
npm run build
cd ..

# --- Step 8: Create data directory ---
mkdir -p data

# --- Step 9: Setup environment variables ---
if [ ! -f .env ]; then
    log "Creating .env file..."
    JWT_SECRET=$(openssl rand -hex 32)
    cat > .env << EOF
PORT=5000
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
DB_PATH=./data/maintenance.db
CLIENT_URL=http://$(curl -s ifconfig.me)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
EOF
    warn "Edit .env to configure email (SMTP) settings"
fi

# --- Step 10: Seed database ---
log "Seeding database with sample data..."
node scripts/seed.js

# --- Step 11: Setup systemd service ---
log "Creating systemd service..."
sudo tee /etc/systemd/system/apartment-maintenance.service > /dev/null << EOF
[Unit]
Description=Apartment Maintenance Calculator
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=apt-maintenance
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable apartment-maintenance
sudo systemctl start apartment-maintenance

# --- Step 12: Configure Nginx ---
log "Configuring Nginx..."
SERVER_IP=$(curl -s ifconfig.me)

sudo tee /etc/nginx/sites-available/apartment-maintenance > /dev/null << EOF
server {
    listen 80;
    server_name ${SERVER_IP} _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
    gzip_min_length 1000;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 90;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/apartment-maintenance /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# --- Step 13: Setup SSL (if domain is configured) ---
warn "To setup SSL with a domain, run:"
warn "  sudo certbot --nginx -d yourdomain.com"

# --- Step 14: Setup log rotation ---
sudo tee /etc/logrotate.d/apartment-maintenance > /dev/null << EOF
/var/log/apartment-maintenance.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
}
EOF

# --- Done ---
echo ""
echo "============================================"
log "Deployment complete!"
echo "============================================"
echo ""
echo "  App URL:    http://${SERVER_IP}"
echo "  Admin:      admin@apartment.com / admin123"
echo ""
echo "  Useful commands:"
echo "    sudo systemctl status apartment-maintenance"
echo "    sudo systemctl restart apartment-maintenance"
echo "    sudo journalctl -u apartment-maintenance -f"
echo ""
echo "  For SSL setup:"
echo "    sudo certbot --nginx -d yourdomain.com"
echo ""
warn "IMPORTANT: Change the admin password after first login!"
warn "IMPORTANT: Edit .env to configure email (SMTP) settings"
echo "============================================"
