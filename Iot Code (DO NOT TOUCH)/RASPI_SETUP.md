# Raspberry Pi Device Manager Setup Guide

This guide will help you set up the Raspberry Pi device manager for the Durian Farm Dashboard system.

## 📋 Prerequisites

- Raspberry Pi with Raspberry Pi OS (or similar Linux distribution)
- Python 3.6 or higher
- Internet connection
- RTSP cameras (optional, for camera feed functionality)
- FFmpeg installed (for HLS conversion)

## 🔧 Installation Steps

### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python packages
pip3 install requests

# Install FFmpeg
sudo apt install ffmpeg -y

# Install nginx (for serving HLS files)
sudo apt install nginx -y
```

### 2. Setup Directory Structure

```bash
# Create working directory
mkdir -p ~/raspi-device-manager
cd ~/raspi-device-manager

# Copy files to this directory:
# - raspi_device_manager.py
# - ffmpeg_hls_launcher.py
# - camera_config.json
# - raspi-camera.service
# - ffmpeg-hls.service

# Make scripts executable
chmod +x raspi_device_manager.py
chmod +x ffmpeg_hls_launcher.py
```

### 3. Configure Camera Streams

Edit `camera_config.json` with your RTSP camera URLs:

```json
{
  "cam1": "rtsp://username:password@192.168.1.100:554/stream1",
  "cam2": "rtsp://username:password@192.168.1.100:554/stream2"
}
```

**Note:** Replace `username`, `password`, and IP addresses with your actual camera credentials.

### 4. Setup HLS Output Directory

```bash
# Create HLS output directory
sudo mkdir -p /var/www/html/hls
sudo chown -R pi:pi /var/www/html/hls

# Configure nginx to serve HLS files
sudo nano /etc/nginx/sites-available/default
```

Add this location block to nginx config:

```nginx
location /hls/ {
    alias /var/www/html/hls/;
    add_header Cache-Control no-cache;
    add_header Access-Control-Allow-Origin *;
    types {
        application/vnd.apple.mpegurl m3u8;
        video/mp2t ts;
    }
}
```

Restart nginx:

```bash
sudo systemctl restart nginx
```

### 5. Install Systemd Services

```bash
# Copy service files to systemd directory
sudo cp raspi-camera.service /etc/systemd/system/
sudo cp ffmpeg-hls.service /etc/systemd/system/

# Update service file paths if needed
sudo nano /etc/systemd/system/raspi-camera.service
sudo nano /etc/systemd/system/ffmpeg-hls.service

# Reload systemd
sudo systemctl daemon-reload

# Enable services to start on boot
sudo systemctl enable raspi-camera.service
sudo systemctl enable ffmpeg-hls.service

# Start services
sudo systemctl start ffmpeg-hls.service
sudo systemctl start raspi-camera.service
```

### 6. Verify Installation

```bash
# Check service status
sudo systemctl status raspi-camera.service
sudo systemctl status ffmpeg-hls.service

# View logs
sudo journalctl -u raspi-camera.service -f
sudo journalctl -u ffmpeg-hls.service -f

# Or check log files
tail -f ~/raspi-device-manager/raspi_device_manager.log
tail -f ~/raspi-device-manager/ffmpeg_hls.log
```

## 🔍 Device ID Generation

The script automatically generates a device ID from the Pi's MAC address:

1. Reads MAC address from `/sys/class/net/eth0/address` or `/sys/class/net/wlan0/address`
2. Removes colons
3. Converts to uppercase
4. Prefixes with `pi_`

**Example:**
- MAC: `A4:27:33:1B:52:11`
- Device ID: `pi_A427331B5211`

## 📝 Claiming the Device

1. Run the device manager script (or wait for it to start automatically)
2. The script will display the device ID in the logs
3. Go to the Durian Dashboard → Settings → Device Management
4. Enter the device ID (e.g., `pi_A427331B5211`)
5. Enter a device name (e.g., "Zone A Camera Server")
6. Select the zone
7. Click "Claim Device"

The Pi will detect the claim and start publishing camera feeds automatically.

## 🔄 How It Works

### Initial Setup Phase:
1. Pi generates device ID from MAC address
2. Pi checks Firebase `/device_registry/<deviceId>/` every 5 seconds
3. When `claimed: true` and `owner_uid` exists, Pi proceeds

### Active Phase:
1. Pi reads device info (name, zone) from registry
2. Pi detects its local IP address
3. Pi generates HLS URLs: `http://<local_ip>/hls/<cam_name>.m3u8`
4. Pi writes to Firebase:
   - `/users/<uid>/devices/<deviceId>/device_info/`
   - `/users/<uid>/devices/<deviceId>/camera_feeds/`
5. Pi updates `device_info` every 30 seconds (keeps `last_online` current)

### FFmpeg HLS Conversion:
1. FFmpeg reads RTSP streams from `camera_config.json`
2. Converts each stream to HLS format
3. Outputs `.m3u8` playlists and `.ts` segments to `/var/www/html/hls/`
4. Nginx serves these files over HTTP

## 🐛 Troubleshooting

### Device not claiming:
- Check that device ID matches exactly (case-sensitive)
- Verify Firebase connection: `curl https://testing-151e6-default-rtdb.asia-southeast1.firebasedatabase.app/device_registry/pi_XXXXXXXXXXXX.json`
- Check logs: `tail -f raspi_device_manager.log`

### Camera feeds not showing:
- Verify FFmpeg is running: `ps aux | grep ffmpeg`
- Check HLS files exist: `ls -la /var/www/html/hls/`
- Test HLS URL: `curl http://localhost/hls/cam1.m3u8`
- Verify nginx is serving files: `curl http://<pi_ip>/hls/cam1.m3u8`
- Check camera_config.json has correct RTSP URLs

### FFmpeg errors:
- Test RTSP connection: `ffmpeg -rtsp_transport tcp -i <rtsp_url> -t 5 test.mp4`
- Check camera credentials
- Verify network connectivity to camera

### Service not starting:
- Check service status: `sudo systemctl status raspi-camera.service`
- Check file paths in service file
- Verify Python path: `which python3`
- Check permissions: `ls -la raspi_device_manager.py`

## 📊 Monitoring

### View Real-time Logs:
```bash
# Device manager logs
tail -f ~/raspi-device-manager/raspi_device_manager.log

# FFmpeg logs
tail -f ~/raspi-device-manager/ffmpeg_hls.log

# Systemd logs
sudo journalctl -u raspi-camera.service -f
sudo journalctl -u ffmpeg-hls.service -f
```

### Check Firebase Data:
```bash
# Check device registry
curl https://testing-151e6-default-rtdb.asia-southeast1.firebasedatabase.app/device_registry/pi_XXXXXXXXXXXX.json

# Check camera feeds (requires authentication)
# Use browser or Firebase console
```

## 🔐 Security Notes

- Camera RTSP credentials are stored in `camera_config.json` (keep this file secure)
- Firebase security rules allow unauthenticated writes to `camera_feeds` (deviceId is unique, so only the Pi can write to its own path)
- HLS files are served over HTTP (consider HTTPS for production)

## 📚 File Structure

```
~/raspi-device-manager/
├── raspi_device_manager.py    # Main device manager script
├── ffmpeg_hls_launcher.py     # FFmpeg HLS converter
├── camera_config.json         # Camera RTSP URLs
├── raspi_device_manager.log   # Device manager logs
├── ffmpeg_hls.log            # FFmpeg logs
├── raspi-camera.service      # Systemd service for device manager
└── ffmpeg-hls.service        # Systemd service for FFmpeg
```

## ✅ Verification Checklist

- [ ] Python 3 installed
- [ ] `requests` package installed
- [ ] FFmpeg installed
- [ ] Nginx installed and configured
- [ ] HLS output directory created and writable
- [ ] `camera_config.json` configured with RTSP URLs
- [ ] Scripts are executable
- [ ] Systemd services installed and enabled
- [ ] Services are running
- [ ] Device ID generated correctly
- [ ] Device claimed in dashboard
- [ ] Camera feeds appearing in Firebase
- [ ] HLS streams accessible via HTTP

## 🚀 Next Steps

After setup:
1. Claim the device in the dashboard (Settings → Device Management)
2. Verify camera feeds appear in Firebase
3. View live feeds on the Map page (select the zone with the Pi device)

