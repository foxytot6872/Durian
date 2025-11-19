# Troubleshooting HLS Stream Connection Refused

## 🔴 Error: `ERR_CONNECTION_REFUSED` on `http://192.168.1.140/hls/cam1.m3u8`

This means the browser cannot connect to the Raspberry Pi's web server. Let's fix this step by step.

## ✅ Step-by-Step Fix

### Step 1: Check FFmpeg Service

```bash
# Check if FFmpeg service is running
sudo systemctl status ffmpeg-hls.service

# If not running, start it
sudo systemctl start ffmpeg-hls.service

# Enable it to start on boot
sudo systemctl enable ffmpeg-hls.service

# Check logs
sudo journalctl -u ffmpeg-hls.service -f
```

**Expected:** Service should be `active (running)`

### Step 2: Check if HLS Files Are Being Generated

```bash
# Check if HLS directory exists and has files
ls -la /var/www/html/hls/

# Should see files like:
# - cam1.m3u8
# - cam1_000.ts
# - cam1_001.ts
# etc.
```

**If directory doesn't exist:**
```bash
# Create directory
sudo mkdir -p /var/www/html/hls
sudo chown -R pi:pi /var/www/html/hls
```

### Step 3: Check Nginx Service

```bash
# Check if Nginx is running
sudo systemctl status nginx

# If not running, start it
sudo systemctl start nginx

# Enable it to start on boot
sudo systemctl enable nginx
```

**Expected:** Service should be `active (running)`

### Step 4: Check Nginx Configuration

```bash
# Check Nginx config
sudo nano /etc/nginx/sites-available/default
```

**Add or verify this location block exists:**

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    # ... other config ...
    
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
}
```

**After editing, test and reload:**
```bash
# Test configuration
sudo nginx -t

# If test passes, reload
sudo systemctl reload nginx
```

### Step 5: Test HLS Stream from Pi Itself

```bash
# Test from Pi itself (should work)
curl http://localhost/hls/cam1.m3u8

# Test with IP
curl http://192.168.1.140/hls/cam1.m3u8
```

**Expected:** Should return HLS playlist content

### Step 6: Test from Your Computer

```bash
# From your computer (same network)
curl http://192.168.1.140/hls/cam1.m3u8
```

**If this fails:**
- Check firewall on Pi
- Check network connectivity
- Verify Pi IP address is correct

### Step 7: Check Firewall (if enabled)

```bash
# Check if firewall is blocking port 80
sudo ufw status

# If firewall is active, allow HTTP
sudo ufw allow 80/tcp
sudo ufw reload
```

## 🔍 Complete Diagnostic Script

Run this on your Raspberry Pi to check everything:

```bash
#!/bin/bash
echo "=== FFmpeg Service ==="
sudo systemctl status ffmpeg-hls.service --no-pager -l | head -10

echo -e "\n=== FFmpeg Processes ==="
ps aux | grep ffmpeg | grep -v grep || echo "No FFmpeg processes running"

echo -e "\n=== HLS Directory ==="
ls -la /var/www/html/hls/ 2>/dev/null || echo "Directory /var/www/html/hls/ does not exist"

echo -e "\n=== Nginx Service ==="
sudo systemctl status nginx --no-pager -l | head -10

echo -e "\n=== Nginx Config Test ==="
sudo nginx -t

echo -e "\n=== Test HLS from localhost ==="
curl -s http://localhost/hls/cam1.m3u8 | head -5 || echo "FAILED: Cannot access HLS from localhost"

echo -e "\n=== Test HLS from IP ==="
curl -s http://192.168.1.140/hls/cam1.m3u8 | head -5 || echo "FAILED: Cannot access HLS from IP"

echo -e "\n=== Network Interfaces ==="
ip addr show | grep "inet " | grep -v "127.0.0.1"

echo -e "\n=== Firewall Status ==="
sudo ufw status 2>/dev/null || echo "UFW not installed or not active"
```

## 🎯 Quick Fix Commands

If you want to set everything up quickly:

```bash
# 1. Create HLS directory
sudo mkdir -p /var/www/html/hls
sudo chown -R pi:pi /var/www/html/hls

# 2. Configure Nginx (if not done)
sudo nano /etc/nginx/sites-available/default
# Add the /hls/ location block (see Step 4 above)
sudo nginx -t
sudo systemctl reload nginx

# 3. Start FFmpeg service
sudo systemctl start ffmpeg-hls.service
sudo systemctl enable ffmpeg-hls.service

# 4. Start Nginx (if not running)
sudo systemctl start nginx
sudo systemctl enable nginx

# 5. Test
curl http://localhost/hls/cam1.m3u8
```

## 📋 Common Issues

### Issue 1: FFmpeg Not Running
**Symptom:** No `.m3u8` or `.ts` files in `/var/www/html/hls/`
**Fix:** Start FFmpeg service (Step 1)

### Issue 2: Nginx Not Running
**Symptom:** `ERR_CONNECTION_REFUSED`
**Fix:** Start Nginx service (Step 3)

### Issue 3: Nginx Not Configured
**Symptom:** Nginx running but 404 on `/hls/` path
**Fix:** Add `/hls/` location block (Step 4)

### Issue 4: Permission Issues
**Symptom:** 403 Forbidden errors
**Fix:** 
```bash
sudo chown -R pi:pi /var/www/html/hls
sudo chmod -R 755 /var/www/html/hls
```

### Issue 5: Firewall Blocking
**Symptom:** Connection refused from external devices
**Fix:** Allow port 80 in firewall (Step 7)

## ✅ Verification Checklist

After fixing, verify:

- [ ] FFmpeg service is `active (running)`
- [ ] FFmpeg processes are running (`ps aux | grep ffmpeg`)
- [ ] HLS files exist (`ls /var/www/html/hls/`)
- [ ] Nginx service is `active (running)`
- [ ] Nginx config test passes (`sudo nginx -t`)
- [ ] Can access from Pi: `curl http://localhost/hls/cam1.m3u8`
- [ ] Can access from computer: `curl http://192.168.1.140/hls/cam1.m3u8`
- [ ] Browser can access the URL (no connection refused)

## 🚀 Once Fixed

After all checks pass:
1. Refresh the Map page in your browser
2. Click on the zone with your Pi device
3. Camera feed should load automatically!

