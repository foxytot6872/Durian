# Raspberry Pi Camera Server Deployment (One-Stop Guide)

This document walks you through cloning the repo onto a new Raspberry Pi, configuring Firebase + VPS streaming, and verifying the live feed end-to-end. Follow the checklist in order for each new Pi you bring online.

---

## 1. Prerequisites

- **Hardware**: Raspberry Pi 3/4 with 64-bit OS, microSD ≥16 GB, stable power, Ethernet (preferred) or strong Wi-Fi.
- **Accounts**:
  - Firebase project `testing-151e6` (Realtime Database + Authentication).
  - VPS (Ubuntu/Debian) with public IP (e.g., `161.118.209.162`) running Nginx and writable `/var/www/html/hls`.
- **Secrets**:
  - Firebase REST DB URL: `https://testing-151e6-default-rtdb.asia-southeast1.firebasedatabase.app`.
  - Pi ↔ VPS SSH key pair (private key stored on Pi, public key in `~hlsuploader/.ssh/authorized_keys` on VPS).
  - RTSP URLs for each IP camera.

---

## 2. Prepare the Pi

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git python3 python3-pip python3-venv ffmpeg rsync

# Optional: enable SSH & set hostname
sudo raspi-config
```

Clone the project (or copy just the IoT folder):
```bash
cd ~
git clone https://github.com/your-org/Durian.git
cd "Durian/Iot Code (DO NOT TOUCH)"
```

---

## 3. Configure Camera + VPS

### 3.1 `camera_config.json`
```json
{
  "cam1": "rtsp://user:pass@192.168.1.10:554/stream1"
}
```
- Keys must match the filenames you want (`cam1.m3u8` etc.).
- Add multiple entries for multi-camera Pi nodes.

### 3.2 `vps_config.json`
```json
{
  "vps_host": "161.118.209.162",
  "vps_user": "hlsuploader",
  "vps_port": 22,
  "vps_hls_path": "/var/www/html/hls",
  "vps_public_url": "http://161.118.209.162",
  "ssh_key_path": "/home/pi/.ssh/vps_hls_key",
  "upload_interval": 1
}
```
- `vps_public_url` **must** include protocol (`http://` or `https://`). This is what gets written to Firebase (`camera_feeds` + `device_info/ip_address`).
- Ensure `/home/pi/.ssh/vps_hls_key` is `chmod 600` and the *public* key is installed on the VPS account.

---

## 4. Install Systemd Services

### 4.1 Copy units
```bash
sudo cp raspi-camera.service /etc/systemd/system/
sudo cp ffmpeg-hls.service /etc/systemd/system/
sudo cp hls-uploader.service /etc/systemd/system/
```

### 4.2 Enable/start
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now raspi-camera.service
sudo systemctl enable --now ffmpeg-hls.service
sudo systemctl enable --now hls-uploader.service
```

Services overview:

| Service | Purpose |
|---------|---------|
| `raspi-camera.service` | Runs `raspi_device_manager.py` (claim check, Firebase updates, camera feed URLs). |
| `ffmpeg-hls.service`   | Runs `ffmpeg_hls_launcher.py` to convert RTSP → HLS segments at `/var/www/html/hls`. |
| `hls-uploader.service` | Runs `hls_uploader.py` to rsync HLS files to the VPS with keep-alive + backoff. |

---

## 5. Device Claim Flow (automatic)

1. **Device ID**: `raspi_device_manager.py` derives `pi_<MAC>` (colons removed, uppercase).
2. **Wait for Claim**: Polls `/device_registry/<deviceId>` until `claimed: true` with `owner_uid`.
3. **Initial publish**:
   - `device_info` → `/users/<uid>/devices/<deviceId>/device_info/`
   - `camera_feeds` → `/users/<uid>/devices/<deviceId>/camera_feeds/` (URLs built from `vps_public_url`).
4. **Heartbeat**: `device_info/last_online` updates every 30 s.
5. **Camera URLs**: Rewritten whenever `vps_public_url` changes (restart service after editing `vps_config.json`).

> **Claiming a Pi**: On the dashboard (Settings → Device Management) claim the generated ID `pi_XXXXXXXXXXXX`. ESP32 + Pi share the same workflow.

---

## 6. Testing Checklist

### 6.1 Pi-side
```bash
# Check service status
sudo systemctl status raspi-camera.service
sudo systemctl status ffmpeg-hls.service
sudo systemctl status hls-uploader.service

# Tail logs
sudo journalctl -u raspi-camera.service -f
sudo journalctl -u ffmpeg-hls.service -f
sudo journalctl -u hls-uploader.service -f

# Local HLS directory (Pi)
ls -ltr /var/www/html/hls | tail
```
- Expect fresh `.ts` files every ~2 s and non-zero sizes.

### 6.2 VPS-side
```bash
ssh hlsuploader@161.118.209.162
ls -ltr /var/www/html/hls | tail
watch -n 1 'tail -n 10 /var/www/html/hls/cam1.m3u8'
curl -I http://161.118.209.162/hls/cam1.m3u8
```
- Files should continue updating; playlist should show rolling segments.

### 6.3 Firebase
Check the Realtime Database console:
```
/device_registry/pi_<ID>
/users/<uid>/devices/pi_<ID>/device_info
/users/<uid>/devices/pi_<ID>/camera_feeds
```
- `camera_feeds/cam1` should equal `http://161.118.209.162/hls/cam1.m3u8`.

### 6.4 Dashboard
- Login, open `Map.html`, switch to the zone that owns the Pi.
- Confirm the HLS video starts. If not, open browser devtools → Console & Network tabs for errors.

---

## 7. Troubleshooting Quick Reference

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `Permission denied (publickey)` when uploader runs | VPS missing Pi public key or key permissions wrong | `chmod 600 ~/.ssh/vps_hls_key`; re-add `.pub` to VPS `authorized_keys`. |
| `rsync code 255` in uploader logs | Pi cannot reach VPS SSH (packet loss/firewall) | Check ping, router, ISP, Oracle security list. Pi retries with exponential backoff but network must be restored. |
| `rsync code 23 mkstemp Permission denied` on VPS | `/var/www/html/hls` ownership changed away from `www-data` | `sudo chown -R www-data:www-data /var/www/html/hls && sudo chmod -R 775 /var/www/html/hls`. Pi user must be in `www-data` group if writing locally. |
| FFmpeg `Failed to open file /var/www/html/hls/cam1_000.ts` | Pi-side HLS dir not writable by service user | `sudo chown -R pi:www-data /var/www/html/hls` (or run service as `www-data`). |
| Browser shows one frame then black | Old segments only or rsync stalled | Ensure `.ts` files on VPS refresh every few seconds (check uploader + network). |
| `ERR_CONNECTION_REFUSED` in browser | Port 80 closed or Nginx down | `sudo systemctl status nginx`, check UFW + Oracle security list. |
| `camera_feeds` shows `https://your-domain.com/...` | `vps_public_url` still default | Edit `vps_config.json` → restart `raspi-camera.service`. |

---

## 8. Maintenance

- **Update configs**: edit `camera_config.json` / `vps_config.json`, then restart services (`sudo systemctl restart raspi-camera.service ffmpeg-hls.service hls-uploader.service`).
- **Logs**: `/home/pi/Durian/Iot Code (DO NOT TOUCH)/raspi_device_manager.log` and `hls_uploader.log` capture historical info.
- **OS updates**: `sudo apt update && sudo apt upgrade -y` monthly.
- **Backups**: keep copies of SSH keys and configuration files off-device.

---

## 9. Deployment Checklist (printable)

- [ ] Pi OS updated, SSH enabled.
- [ ] Repo or IoT folder copied to Pi.
- [ ] `camera_config.json` filled with correct RTSP URLs.
- [ ] `vps_config.json` points to actual host + `http://...`.
- [ ] SSH key permissions set (`chmod 600`), VPS trusts key.
- [ ] `/var/www/html/hls` exists on Pi and is writable.
- [ ] Systemd services installed, enabled, and running.
- [ ] Firebase claim performed for `pi_<MAC>`.
- [ ] VPS HLS directory shows rolling segments.
- [ ] Dashboard displays live video for the device zone.

Keep this guide alongside the scripts—everything else from previous troubleshooting notes has been consolidated here.

