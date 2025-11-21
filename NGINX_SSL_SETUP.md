# 🔧 Manual Nginx SSL Configuration Guide

## Problem
Certbot created the certificate but couldn't install it automatically because Nginx doesn't have a matching `server_name` directive.

## Solution: Manual Nginx Configuration

### Step 1: Check Your Certificate Name

```bash
sudo certbot certificates
```

This will show you the exact certificate name (likely `duriancam.duckdns.org`, not `durinacam` - watch for typos!)

### Step 2: Find Your Nginx Configuration File

```bash
# Find the main nginx config
sudo nginx -T | grep -E "server_name|include"

# Or check common locations
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/
ls -la /etc/nginx/nginx.conf
```

### Step 3: Edit Nginx Configuration

Edit your Nginx config file (usually `/etc/nginx/sites-available/default`):

```bash
sudo nano /etc/nginx/sites-available/default
```

Or if you have a custom config:
```bash
sudo nano /etc/nginx/sites-available/your-config-file
```

### Step 4: Update the Configuration

**Replace your current config with this:**

```nginx
# HTTP server - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name duriancam.duckdns.org 161.118.209.162;

    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name duriancam.duckdns.org 161.118.209.162;

    # SSL Certificate paths (Certbot created these)
    ssl_certificate /etc/letsencrypt/live/duriancam.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/duriancam.duckdns.org/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # HLS streaming location
    location /hls/ {
        alias /var/www/html/hls/;
        
        # CORS headers for video streaming
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, OPTIONS';
        add_header Access-Control-Allow-Headers 'Range, Content-Type';

        # Handle CORS preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods 'GET, OPTIONS';
            add_header Access-Control-Allow-Headers 'Range, Content-Type';
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type 'text/plain charset=UTF-8';
            add_header Content-Length 0;
            return 204;
        }

        # MIME types for HLS
        types {
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
        }
        
        # Default type
        default_type application/vnd.apple.mpegurl;
    }

    # Root location (optional - if you serve other files)
    root /var/www/html;
    index index.html;
}
```

### Step 5: Test and Reload Nginx

```bash
# Test configuration syntax
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

### Step 6: Verify SSL is Working

```bash
# Test HTTPS endpoint
curl -I https://duriancam.duckdns.org/hls/cam1.m3u8

# Or test in browser
# https://duriancam.duckdns.org/hls/cam1.m3u8
```

## Alternative: If You Don't Have a Config File Yet

If you don't have an Nginx config file yet, create one:

```bash
# Create new config file
sudo nano /etc/nginx/sites-available/duriancam

# Paste the config above

# Enable the site
sudo ln -s /etc/nginx/sites-available/duriancam /etc/nginx/sites-enabled/

# Remove default config if it conflicts
sudo rm /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

## Troubleshooting

### Certificate Path Issue

If you get "certificate not found", check the actual path:

```bash
sudo ls -la /etc/letsencrypt/live/
```

You'll see a directory with your domain name. Use that exact path.

### Permission Denied

If you get permission errors:
```bash
sudo chown -R www-data:www-data /var/www/html/hls
sudo chmod -R 755 /var/www/html/hls
```

### Port Already in Use

If port 443 is already in use:
```bash
sudo netstat -tulpn | grep :443
sudo systemctl stop apache2  # If Apache is running
sudo systemctl disable apache2
```

### Check Nginx Status

```bash
sudo systemctl status nginx
sudo journalctl -u nginx -f  # View live logs
```

## After Configuration

1. ✅ Test HTTPS: `curl -I https://duriancam.duckdns.org/hls/cam1.m3u8`
2. ✅ Update Firebase camera feed URLs to use `https://duriancam.duckdns.org/hls/cam1.m3u8`
3. ✅ Clear browser cache and test your website

