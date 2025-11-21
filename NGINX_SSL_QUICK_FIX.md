# ✅ Quick Fix: Configure Nginx with Your SSL Certificate

## Your Certificate is Ready! ✅

Your certificate is in: `/etc/letsencrypt/live/duriancam.duckdns.org/`

## Step 1: Verify Certificate Files

Run this to confirm the certificate files exist:

```bash
sudo ls -la /etc/letsencrypt/live/duriancam.duckdns.org/
```

You should see:
- `fullchain.pem` (the certificate)
- `privkey.pem` (the private key)
- `chain.pem` (optional)
- `cert.pem` (optional)

## Step 2: Check Your Current Nginx Config

```bash
sudo cat /etc/nginx/sites-available/default
```

Or if you have a custom config:
```bash
sudo ls -la /etc/nginx/sites-available/
sudo cat /etc/nginx/sites-available/[your-config-file]
```

## Step 3: Update Nginx Configuration

Edit your Nginx config:

```bash
sudo nano /etc/nginx/sites-available/default
```

**Replace everything with this configuration:**

```nginx
# HTTP - Redirect all to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name duriancam.duckdns.org 161.118.209.162;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name duriancam.duckdns.org 161.118.209.162;

    # SSL Certificate (your actual certificate path)
    ssl_certificate /etc/letsencrypt/live/duriancam.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/duriancam.duckdns.org/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # HLS Streaming Location
    location /hls/ {
        alias /var/www/html/hls/;
        
        # CORS Headers for Video Streaming
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, OPTIONS';
        add_header Access-Control-Allow-Headers 'Range, Content-Type';

        # Handle CORS Preflight Requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods 'GET, OPTIONS';
            add_header Access-Control-Allow-Headers 'Range, Content-Type';
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type 'text/plain charset=UTF-8';
            add_header Content-Length 0;
            return 204;
        }

        # MIME Types for HLS
        types {
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
        }
        
        # Default MIME type
        default_type application/vnd.apple.mpegurl;
    }

    # Root location (if you serve other files)
    root /var/www/html;
    index index.html;
}
```

## Step 4: Save and Exit

1. Press `Ctrl + X`
2. Press `Y` (to confirm save)
3. Press `Enter` (to save to the file)

## Step 5: Test Nginx Configuration

```bash
sudo nginx -t
```

**Expected output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

## Step 6: Reload Nginx

```bash
sudo systemctl reload nginx
```

## Step 7: Test HTTPS

```bash
# Test the HTTPS endpoint
curl -I https://duriancam.duckdns.org/hls/cam1.m3u8

# Or test HTTP redirect (should redirect to HTTPS)
curl -I http://duriancam.duckdns.org/hls/cam1.m3u8
```

**Expected results:**
- HTTPS should return `HTTP/2 200` (success)
- HTTP should return `HTTP/1.1 301` (redirect to HTTPS)

## Step 8: Verify in Browser

Open in your browser:
- `https://duriancam.duckdns.org/hls/cam1.m3u8`
- You should see the M3U8 playlist (text file with video segments)

## ✅ Done!

Your HTTPS is now configured! Next steps:

1. **Update Firebase camera feed URLs** to use HTTPS:
   - Change: `http://161.118.209.162/hls/cam1.m3u8`
   - To: `https://duriancam.duckdns.org/hls/cam1.m3u8`

2. **Update your Raspberry Pi script** (if it generates URLs):
   - Update `raspi_device_manager.py` to generate HTTPS URLs

3. **Test your website** - the camera feeds should now work without mixed content errors!

## Troubleshooting

### If `nginx -t` fails:

Check the error message:
```bash
sudo nginx -t
```

Common errors:
- **"Permission denied"**: Certificate files might need readable permissions (they should be fine as-is)
- **"Path not found"**: Double-check the certificate path
- **"Syntax error"**: Check line numbers in the error message

### If reload fails:

```bash
# Check Nginx status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### If HTTPS doesn't work:

1. **Check firewall:**
   ```bash
   sudo ufw allow 443/tcp
   sudo ufw reload
   ```

2. **Check certificate files:**
   ```bash
   sudo ls -la /etc/letsencrypt/live/duriancam.duckdns.org/
   ```

3. **Test certificate directly:**
   ```bash
   sudo openssl x509 -in /etc/letsencrypt/live/duriancam.duckdns.org/fullchain.pem -text -noout
   ```

