# Raspberry Pi Camera Feed Diagnostic Guide

## 🔍 Quick Diagnostic Steps

### 1. Check Camera Configuration

```bash
# On Raspberry Pi, check if camera_config.json exists and has cameras
cat ~/raspi-device-manager/camera_config.json
```

**Expected output:**
```json
{
  "cam1": "rtsp://user:password@192.168.1.100:554/stream1",
  "cam2": "rtsp://user:password@192.168.1.100:554/stream2"
}
```

**If empty or missing:**
- Edit the file with your actual RTSP camera URLs
- Restart the service: `sudo systemctl restart raspi-camera.service`

### 2. Check Full Logs for Camera Feed Messages

```bash
# View full logs (not just -f tail)
sudo journalctl -u raspi-camera.service --no-pager | grep -i "camera\|feed\|hls"
```

**Look for:**
- `Loaded camera config: ['cam1', 'cam2'] cameras`
- `Generated HLS URL for cam1: http://192.168.1.140/hls/cam1.m3u8`
- `Writing to: /users/.../camera_feeds`
- `✅ Camera feeds published successfully` OR `❌ Failed to publish camera feeds`

### 3. Check Firebase for Camera Feeds

**In Firebase Console:**
Path: `/users/3O1jlnF2xUQqS6A2DMfiY7zK79o2/devices/pi_2CCF67390966/camera_feeds/`

**Should contain:**
```json
{
  "cam1": "http://192.168.1.140/hls/cam1.m3u8",
  "cam2": "http://192.168.1.140/hls/cam2.m3u8"
}
```

**Or test via curl:**
```bash
curl "https://testing-151e6-default-rtdb.asia-southeast1.firebasedatabase.app/users/3O1jlnF2xUQqS6A2DMfiY7zK79o2/devices/pi_2CCF67390966/camera_feeds.json"
```

### 4. Check if FFmpeg is Running

```bash
# Check FFmpeg service status
sudo systemctl status ffmpeg-hls.service

# Check if FFmpeg processes are running
ps aux | grep ffmpeg

# Check FFmpeg logs
sudo journalctl -u ffmpeg-hls.service -f
```

### 5. Test HLS Stream Accessibility

```bash
# From Raspberry Pi itself
curl http://192.168.1.140/hls/cam1.m3u8

# From your computer (if on same network)
curl http://192.168.1.140/hls/cam1.m3u8
```

**Expected:** Should return HLS playlist content (`.m3u8` file)

### 6. Check Nginx Configuration

```bash
# Verify nginx is running
sudo systemctl status nginx

# Check if HLS directory exists and is writable
ls -la /var/www/html/hls/

# Check nginx can serve files
curl http://localhost/hls/cam1.m3u8
```

## 🐛 Common Issues

### Issue 1: Camera Config Empty
**Symptom:** No "Loaded camera config" log message
**Fix:** Edit `camera_config.json` with actual RTSP URLs

### Issue 2: Camera Feeds Not in Firebase
**Symptom:** `camera_feeds` path doesn't exist or is empty
**Possible causes:**
- Camera config is empty
- Publishing failed (check logs for errors)
- Firebase security rules blocking write

**Fix:**
1. Check camera_config.json has cameras
2. Check logs for publishing errors
3. Verify Firebase rules allow `.write: true` for `camera_feeds`

### Issue 3: HLS Streams Not Accessible
**Symptom:** Can't access `http://<pi-ip>/hls/cam1.m3u8`
**Possible causes:**
- FFmpeg not running
- Nginx not configured
- HLS files not being generated

**Fix:**
1. Start FFmpeg service: `sudo systemctl start ffmpeg-hls.service`
2. Check nginx config for `/hls/` location
3. Verify FFmpeg is generating `.m3u8` and `.ts` files

## 📋 Complete Diagnostic Command

Run this on your Raspberry Pi to get full status:

```bash
echo "=== Device Manager Status ==="
sudo systemctl status raspi-camera.service --no-pager -l

echo -e "\n=== Camera Config ==="
cat ~/raspi-device-manager/camera_config.json 2>/dev/null || echo "File not found"

echo -e "\n=== Recent Device Manager Logs ==="
sudo journalctl -u raspi-camera.service -n 50 --no-pager

echo -e "\n=== FFmpeg Status ==="
sudo systemctl status ffmpeg-hls.service --no-pager -l

echo -e "\n=== FFmpeg Processes ==="
ps aux | grep ffmpeg | grep -v grep

echo -e "\n=== HLS Files ==="
ls -la /var/www/html/hls/ 2>/dev/null || echo "Directory not found"

echo -e "\n=== Test HLS Stream ==="
curl -s http://localhost/hls/cam1.m3u8 | head -5 || echo "Stream not accessible"
```

## ✅ Expected Working State

When everything is working, you should see:

1. **Device Manager Logs:**
   ```
   Loaded camera config: ['cam1', 'cam2'] cameras
   Generated HLS URL for cam1: http://192.168.1.140/hls/cam1.m3u8
   Writing to: /users/.../camera_feeds
   ✅ Camera feeds published successfully
   ```

2. **Firebase:**
   - `/users/<uid>/devices/pi_2CCF67390966/camera_feeds/` contains camera URLs

3. **FFmpeg:**
   - Process running for each camera
   - Generating `.m3u8` and `.ts` files in `/var/www/html/hls/`

4. **HLS Streams:**
   - Accessible at `http://192.168.1.140/hls/cam1.m3u8`

