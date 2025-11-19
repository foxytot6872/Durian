#!/bin/bash
# Fix Nginx Configuration for HLS Streaming
# This script creates a proper nginx config file

cat > /tmp/nginx_default_config << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;
    
    server_name _;
    
    # HLS streaming location
    location /hls/ {
        alias /var/www/html/hls/;
        add_header Cache-Control no-cache;
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, OPTIONS';
        add_header Access-Control-Allow-Headers 'Range';
        
        types {
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
        }
    }
    
    # Default location
    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

echo "Backing up current config..."
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

echo "Installing new config..."
sudo cp /tmp/nginx_default_config /etc/nginx/sites-available/default

echo "Testing configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuration is valid!"
    echo "Starting nginx..."
    sudo systemctl start nginx
    sudo systemctl enable nginx
    echo "✅ Nginx should now be running!"
else
    echo "❌ Configuration test failed. Please check the error above."
    exit 1
fi

