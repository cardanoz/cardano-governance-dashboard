#!/bin/bash
# Server configuration for adatool-frontend (Nginx + systemd)
# Run with sudo: sudo bash setup-server-config.sh

set -e

echo "=== Creating systemd service for Next.js ==="
cat > /etc/systemd/system/adatool-frontend.service << 'SVCEOF'
[Unit]
Description=ADAtool Frontend (Next.js)
After=network.target adatool-api.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/adatool-frontend
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0

[Install]
WantedBy=multi-user.target
SVCEOF

echo "=== Creating Nginx config for adatool.net ==="
cat > /etc/nginx/sites-available/adatool.net << 'NGXEOF'
server {
    listen 80;
    server_name adatool.net www.adatool.net;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name adatool.net www.adatool.net;

    # SSL certs will be added by certbot
    ssl_certificate /etc/letsencrypt/live/adatool.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/adatool.net/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Next.js app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Next.js static assets (long cache)
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}
NGXEOF

echo "=== Enabling Nginx site ==="
ln -sf /etc/nginx/sites-available/adatool.net /etc/nginx/sites-enabled/
nginx -t && echo "Nginx config OK"

echo ""
echo "=== Next steps ==="
echo "1. Point adatool.net DNS A record to this server's IP (if not done)"
echo "2. If Cloudflare proxy is ON for adatool.net, temporarily set to DNS-only for certbot"
echo "3. Run: sudo certbot --nginx -d adatool.net -d www.adatool.net"
echo "4. Build frontend: cd /home/ubuntu/adatool-frontend && npm run build"
echo "5. Copy static files: cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/"
echo "6. Start service: sudo systemctl daemon-reload && sudo systemctl enable --now adatool-frontend"
echo "7. Restart nginx: sudo systemctl restart nginx"
echo ""
