# 🔒 HTTPS Setup Guide for HLS Camera Feeds

## Problem

When your website is hosted on Firebase (HTTPS), it cannot load HTTP resources due to **Mixed Content** security policies. Your camera feeds are served from `http://161.118.209.162/hls/cam1.m3u8`, which gets blocked.

**Error you're seeing:**
```
Mixed Content: The page at 'https://testing-151e6.web.app/Map.html' was loaded over HTTPS, 
but requested an insecure XMLHttpRequest endpoint 'http://161.118.209.162/hls/cam1.m3u8'. 
This request has been blocked.
```

## ✅ Solution: Set Up HTTPS on Your VPS Server

Your VPS server at `161.118.209.162` needs to serve HLS streams over HTTPS. Here are your options:

---

## Option 1: Use Let's Encrypt SSL Certificate (Recommended - Free)

### Step 1: Install Certbot on Your VPS

```bash
# SSH into your VPS
ssh hlsuploader@161.118.209.162

# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### Step 2: Get SSL Certificate

**Option A: If you have a domain name pointing to your VPS:**

```bash
# Replace 'yourdomain.com' with your actual domain
sudo certbot --nginx -d yourdomain.com
```

**Option B: If you only have an IP address (161.118.209.162):**

Let's Encrypt requires a domain name. You have two choices:

1. **Get a free domain** (e.g., from [Freenom](https://www.freenom.com) or [No-IP](https://www.noip.com))
2. **Use a self-signed certificate** (see Option 2 below)

### Step 3: Configure Nginx for HTTPS

After Certbot installs the certificate, it should automatically configure Nginx. Verify with:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Test HTTPS

```bash
curl -I https://161.118.209.162/hls/cam1.m3u8
# or with domain:
curl -I https://yourdomain.com/hls/cam1.m3u8
```

### Step 5: Update Firebase Camera Feed URLs

Update the camera feed URLs in Firebase to use HTTPS:

1. Go to Firebase Console → Realtime Database
2. Navigate to: `/users/<uid>/devices/<deviceId>/camera_feeds/`
3. Change URLs from `http://` to `https://`
   - Example: `http://161.118.209.162/hls/cam1.m3u8` → `https://161.118.209.162/hls/cam1.m3u8`

**Or update your Raspberry Pi script** (`raspi_device_manager.py`) to generate HTTPS URLs:

```python
# In generate_hls_urls function, change:
base_url = f"http://{local_ip}"  # Change to:
base_url = f"https://{local_ip}"  # or use your domain
```

---

## Option 2: Self-Signed Certificate (Quick Fix, Shows Warning)

If you don't have a domain name, you can use a self-signed certificate. **Note:** Browsers will show a security warning, but it will work.

### Step 1: Generate Self-Signed Certificate

```bash
ssh hlsuploader@161.118.209.162

# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Generate certificate (valid for 365 days)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/nginx-selfsigned.key \
  -out /etc/nginx/ssl/nginx-selfsigned.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=161.118.209.162"
```

### Step 2: Update Nginx Configuration

Edit your Nginx config (usually `/etc/nginx/sites-available/default` or `/etc/nginx/nginx.conf`):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name 161.118.209.162;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name 161.118.209.162;

    # SSL Certificate
    ssl_certificate /etc/nginx/ssl/nginx-selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx-selfsigned.key;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # HLS streaming location
    location /hls/ {
        alias /var/www/html/hls/;
        add_header Cache-Control no-cache;
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, OPTIONS';
        add_header Access-Control-Allow-Headers 'Range';

        # CORS preflight
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods 'GET, OPTIONS';
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type 'text/plain charset=UTF-8';
            add_header Content-Length 0;
            return 204;
        }

        types {
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
        }
    }
}
```

### Step 3: Test and Reload Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Update URLs to HTTPS

Same as Option 1, Step 5 - update Firebase or your Pi script to use HTTPS URLs.

**⚠️ Important:** With self-signed certificates, users will see a security warning the first time. They need to click "Advanced" → "Proceed to 161.118.209.162" to allow it.

---

## Option 3: Use a Proxy/CDN (Advanced)

You can use a service like Cloudflare (free) to proxy your VPS and provide HTTPS:

1. Sign up for [Cloudflare](https://cloudflare.com) (free)
2. Add your domain/IP to Cloudflare
3. Cloudflare will provide HTTPS automatically
4. Update your DNS to point to Cloudflare

---

## Option 4: Firebase Functions Proxy (Temporary Workaround)

If you can't set up HTTPS on the VPS immediately, you can create a Firebase Cloud Function to proxy the requests:

**Note:** This adds latency and costs. HTTPS on the VPS is the better solution.

---

## Testing After Setup

1. **Test HTTPS endpoint:**
   ```bash
   curl -I https://161.118.209.162/hls/cam1.m3u8
   ```

2. **Clear browser cache** and reload your site

3. **Check browser console** - the mixed content error should be gone

4. **Verify video loads** on your Map page

---

## Quick Reference

**Current (HTTP - Broken):**
```
http://161.118.209.162/hls/cam1.m3u8
```

**After Setup (HTTPS - Working):**
```
https://161.118.209.162/hls/cam1.m3u8
```

---

## Recommended Solution

**Use Option 1 (Let's Encrypt)** if possible - it's free, automatic, and trusted by browsers.

If you don't have a domain, get a free one from:
- [Freenom](https://www.freenom.com) - Free `.tk`, `.ml`, `.ga` domains
- [No-IP](https://www.noip.com) - Free dynamic DNS
- [DuckDNS](https://www.duckdns.org) - Free dynamic DNS

Then set up Let's Encrypt with your domain!

---

## Troubleshooting

**"Certificate verification failed"**
- Make sure the certificate is valid
- Check certificate expiration: `sudo certbot certificates`

**"Still getting mixed content error"**
- Clear browser cache
- Check Firebase URLs are updated to `https://`
- Verify Nginx is serving over HTTPS: `curl -I https://161.118.209.162/hls/cam1.m3u8`

**"Video doesn't load"**
- Check browser console for errors
- Verify CORS headers are set correctly
- Test the HTTPS URL directly in browser

---

**Next Steps:**
1. Choose an option above
2. Set up HTTPS on your VPS
3. Update camera feed URLs to use HTTPS
4. Test the camera feeds on your site

