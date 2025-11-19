# Camera Feed Integration Guide

## ✅ Camera Feeds Are Already Integrated!

The camera feed system is **already built into your website**. Here's how it works:

## 📍 Where Camera Feeds Appear

Camera feeds automatically appear on the **Map page** (`Map.html`) when:
1. A Raspberry Pi device is claimed and assigned to a zone
2. The Pi is publishing camera feed URLs to Firebase
3. You navigate to that zone on the Map page

## 🔄 How It Works (Automatic)

### 1. **Pi Device Setup** (Already Done)
- Pi generates device ID: `pi_XXXXXXXXXXXX`
- Pi checks Firebase until device is claimed
- Pi publishes camera feed URLs to: `/users/<uid>/devices/<deviceId>/camera_feeds/`

### 2. **Dashboard Loading** (Automatic)
- `firebase-dashboard.js` loads all user devices
- For Pi devices (`type: "camera_server"`), it loads camera feeds
- Camera feeds are polled every 5 seconds for updates

### 3. **Map Page Display** (Automatic)
- When you click a zone on the Map page
- `zone-navigation.js` checks if that zone has Pi devices
- If found, it automatically loads and displays the first camera feed
- Uses HLS.js to play the `.m3u8` stream

## 🎥 Current Implementation

### Map.html Structure:
```html
<!-- Camera Feed Section -->
<div class="camera-section">
    <div class="camera-feed" id="cameraFeed">
        <video id="cameraVideo" ...></video>
        <div class="camera-placeholder" id="cameraPlaceholder">
            <!-- Shows "No Camera" or "No Feeds" when no camera available -->
        </div>
    </div>
</div>
```

### JavaScript Flow:
1. **Firebase Dashboard Manager** (`firebase-dashboard.js`):
   - Loads devices from `/users/<uid>/devices/`
   - For Pi devices, loads camera feeds from `/camera_feeds/`
   - Polls every 5 seconds for updates

2. **Zone Navigation** (`zone-navigation.js`):
   - `setupCameraFeed()` - Finds Pi devices in current zone
   - `loadCameraFeed(feedUrl)` - Loads HLS stream using HLS.js
   - Automatically switches feeds when zone changes

## 🚀 How to Use

### Step 1: Claim Your Pi Device
1. Go to **Settings → Device Management**
2. Enter your Pi device ID (e.g., `pi_A427331B5211`)
3. Enter device name (e.g., "Zone A Camera Server")
4. Select the zone
5. Click **Claim Device**

### Step 2: Verify Pi is Publishing Feeds
Check Firebase Console or logs:
- Path: `/users/<your-uid>/devices/pi_XXXXXXXXXXXX/camera_feeds/`
- Should contain: `{ "cam1": "http://<pi-ip>/hls/cam1.m3u8", ... }`

### Step 3: View on Map Page
1. Go to **Map** page
2. Click on the zone where your Pi device is located
3. Camera feed should automatically appear!

## 🎨 What You'll See

### When Camera is Available:
- ✅ Video player with live stream
- ✅ Zone title showing current zone
- ✅ "Live Camera Feed" status indicator (green pulsing dot)
- ✅ Fullscreen and Record buttons

### When No Camera:
- 📭 Placeholder showing "No Camera" or "No Feeds"
- ℹ️ Helpful message explaining no camera available

## 🔧 Technical Details

### HLS Stream Format:
- Pi converts RTSP → HLS using FFmpeg
- Output: `.m3u8` playlist + `.ts` segments
- Served via nginx at: `http://<pi-ip>/hls/<cam_name>.m3u8`

### Browser Compatibility:
- **Chrome/Edge**: Uses HLS.js library
- **Safari**: Native HLS support (fallback)
- **Firefox**: Uses HLS.js library

### Error Handling:
- Automatic retry on network errors
- Falls back to placeholder on fatal errors
- Shows appropriate messages for different states

## 📝 Code Locations

### Files Involved:
1. **Map.html** - Video element and UI
2. **js/firebase-dashboard.js** - Loads camera feeds from Firebase
3. **js/zone-navigation.js** - Displays camera feeds per zone
4. **css/zone-styles.css** - Camera feed styling

### Key Functions:
- `FirebaseDashboardManager.loadCameraFeeds(deviceId)` - Fetches feeds from Firebase
- `CameraFeedManager.setupCameraFeed()` - Finds cameras in current zone
- `CameraFeedManager.loadCameraFeed(feedUrl)` - Plays HLS stream

## 🐛 Troubleshooting

### Camera Not Showing?

1. **Check Device is Claimed:**
   ```bash
   # In Firebase Console, check:
   /device_registry/pi_XXXXXXXXXXXX/
   # Should have: claimed: true, owner_uid: <your-uid>
   ```

2. **Check Camera Feeds in Firebase:**
   ```bash
   # In Firebase Console, check:
   /users/<your-uid>/devices/pi_XXXXXXXXXXXX/camera_feeds/
   # Should have: { "cam1": "http://...", ... }
   ```

3. **Check Pi is Running:**
   ```bash
   # On Raspberry Pi:
   sudo systemctl status raspi-camera.service
   sudo journalctl -u raspi-camera.service -f
   ```

4. **Check HLS Stream is Accessible:**
   ```bash
   # Test from browser or curl:
   curl http://<pi-ip>/hls/cam1.m3u8
   # Should return playlist content
   ```

5. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Check Console for errors
   - Look for HLS.js messages

### Common Issues:

**"No Camera" message:**
- Pi device not assigned to current zone
- Check zone assignment in Settings

**"No Feeds" message:**
- Pi device exists but not publishing feeds
- Check Pi logs and Firebase path

**Video not playing:**
- HLS stream not accessible from browser
- Check nginx configuration
- Check CORS headers
- Verify Pi IP is reachable

**"Loading..." forever:**
- Camera feeds not loading from Firebase
- Check authentication
- Check Firebase security rules

## ✨ Features Already Implemented

- ✅ Automatic camera detection per zone
- ✅ HLS video playback with HLS.js
- ✅ Real-time feed updates (polls every 5 seconds)
- ✅ Error handling and recovery
- ✅ Loading states and placeholders
- ✅ Multiple camera support (shows first available)
- ✅ Fullscreen button
- ✅ Record button (UI ready)

## 🎯 Next Steps (Optional Enhancements)

If you want to add more features:

1. **Camera Selection Dropdown:**
   - Show all cameras from Pi device
   - Let user select which camera to view

2. **Multi-Zone Camera View:**
   - Show cameras from multiple zones
   - Grid layout for multiple feeds

3. **Camera Controls:**
   - PTZ (Pan/Tilt/Zoom) controls
   - Snapshot capture
   - Recording functionality

4. **Camera Status Indicators:**
   - Show which cameras are online/offline
   - Display last update time

## 📚 Summary

**You don't need to add anything!** The camera feed system is already fully integrated. Just:

1. ✅ Claim your Pi device in Settings
2. ✅ Make sure Pi is publishing feeds to Firebase
3. ✅ Go to Map page and click the zone
4. ✅ Camera feed appears automatically!

The system handles everything else automatically. 🎉

