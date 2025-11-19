#!/usr/bin/env python3
"""
Raspberry Pi Device Manager
Manages device registration, claim verification, and camera feed publishing to Firebase RTDB.

Architecture:
- Device ID: pi_<12 hex chars from MAC>
- Checks claim status in /device_registry/<deviceId>/
- Publishes camera feeds to /users/<uid>/devices/<deviceId>/camera_feeds/
- Updates device_info in /users/<uid>/devices/<deviceId>/device_info/
"""

import json
import logging
import time
import subprocess
import socket
import requests
from pathlib import Path
from typing import Optional, Dict, Any

# Configuration
FIREBASE_DB_URL = "https://testing-151e6-default-rtdb.asia-southeast1.firebasedatabase.app"
CONFIG_FILE = Path(__file__).parent / "camera_config.json"
LOG_FILE = Path(__file__).parent / "raspi_device_manager.log"
CHECK_INTERVAL = 5  # seconds between claim status checks
UPDATE_INTERVAL = 30  # seconds between device_info updates

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def get_mac_address() -> str:
    """
    Get the Raspberry Pi's MAC address.
    Returns MAC address without colons, uppercase.
    """
    try:
        # Try to get MAC from eth0 (wired) first, then wlan0 (wireless)
        for interface in ['eth0', 'wlan0']:
            try:
                result = subprocess.run(
                    ['cat', f'/sys/class/net/{interface}/address'],
                    capture_output=True,
                    text=True,
                    check=True
                )
                mac = result.stdout.strip().upper().replace(':', '')
                if mac:
                    logger.info(f"Found MAC address from {interface}: {mac}")
                    return mac
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue
        
        # Fallback: use socket
        mac = ':'.join(['{:02x}'.format((socket.gethostbyname(socket.gethostname()) >> i) & 0xff) 
                       for i in range(0, 8*6, 8)])
        mac = mac.upper().replace(':', '')
        logger.warning(f"Using fallback MAC address method: {mac}")
        return mac
    except Exception as e:
        logger.error(f"Error getting MAC address: {e}")
        raise


def get_device_id() -> str:
    """
    Generate device ID in format: pi_<12 hex characters>
    """
    mac = get_mac_address()
    if len(mac) != 12:
        logger.warning(f"MAC address length unexpected: {len(mac)}, expected 12")
    device_id = f"pi_{mac[:12]}"
    logger.info(f"Generated device ID: {device_id}")
    return device_id


def get_local_ip() -> str:
    """
    Get the Raspberry Pi's local IP address.
    """
    try:
        # Connect to a remote address to determine local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            # Doesn't actually connect, just determines local IP
            s.connect(('8.8.8.8', 80))
            ip = s.getsockname()[0]
        finally:
            s.close()
        logger.info(f"Detected local IP: {ip}")
        return ip
    except Exception as e:
        logger.error(f"Error getting local IP: {e}")
        # Fallback
        try:
            hostname = socket.gethostname()
            ip = socket.gethostbyname(hostname)
            logger.info(f"Using fallback IP detection: {ip}")
            return ip
        except:
            logger.error("Could not determine local IP")
            return "0.0.0.0"


def firebase_get(path: str) -> Optional[Dict[str, Any]]:
    """
    GET request to Firebase RTDB.
    Path should NOT include leading slash or .json
    Returns parsed JSON or None if 404
    """
    url = f"{FIREBASE_DB_URL}/{path}.json"
    
    try:
        response = requests.get(url, timeout=10)
        
        if response.status_code == 404:
            logger.debug(f"Firebase GET {path}: Not found (404)")
            return None
        
        if response.status_code == 200:
            data = response.json()
            logger.debug(f"Firebase GET {path}: Success")
            return data
        
        logger.warning(f"Firebase GET {path}: Unexpected status {response.status_code}")
        return None
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Firebase GET {path}: Request failed - {e}")
        return None


def firebase_put(path: str, data: Dict[str, Any]) -> bool:
    """
    PUT request to Firebase RTDB.
    Path should NOT include leading slash or .json
    Returns True if successful, False otherwise
    """
    url = f"{FIREBASE_DB_URL}/{path}.json"
    
    try:
        response = requests.put(
            url,
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code in [200, 204]:
            logger.info(f"Firebase PUT {path}: Success")
            return True
        
        # Detailed error handling
        error_msg = f"Firebase PUT {path}: Failed with status {response.status_code}"
        
        if response.status_code == 401:
            error_msg += " - Authentication required (check Firebase security rules)"
        elif response.status_code == 403:
            error_msg += " - Permission denied (check Firebase security rules allow unauthenticated writes)"
        elif response.status_code == 404:
            error_msg += " - Path not found (check path structure)"
        else:
            error_msg += f" - {response.text}"
        
        logger.error(error_msg)
        
        # Try to parse error response
        try:
            error_data = response.json()
            if isinstance(error_data, dict) and 'error' in error_data:
                logger.error(f"Firebase error: {error_data['error']}")
        except:
            logger.error(f"Response body: {response.text[:200]}")
        
        return False
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Firebase PUT {path}: Request failed - {e}")
        return False


def wait_until_claimed(device_id: str) -> Optional[str]:
    """
    Poll Firebase until device is claimed.
    Returns owner_uid if claimed, None if error/timeout.
    """
    logger.info(f"Waiting for device {device_id} to be claimed...")
    logger.info(f"To claim this device, go to Settings → Device Management in the dashboard")
    logger.info(f"Enter device ID: {device_id}")
    
    attempt = 0
    while True:
        attempt += 1
        logger.info(f"Attempt #{attempt}: Checking claim status...")
        
        device_data = firebase_get(f"device_registry/{device_id}")
        
        if device_data is None:
            logger.info("Device not found in registry. Waiting for claim...")
        elif device_data.get("claimed") and device_data.get("owner_uid"):
            owner_uid = device_data["owner_uid"]
            logger.info(f"✅ Device claimed! Owner UID: {owner_uid}")
            return owner_uid
        else:
            logger.info("Device exists but not claimed yet. Waiting...")
        
        time.sleep(CHECK_INTERVAL)


def load_camera_config() -> Dict[str, str]:
    """
    Load camera configuration from JSON file.
    Returns dict mapping camera names to RTSP URLs.
    """
    if not CONFIG_FILE.exists():
        logger.warning(f"Camera config file not found: {CONFIG_FILE}")
        logger.info("Creating default camera_config.json...")
        default_config = {
            "cam1": "rtsp://user:password@192.168.1.100:554/stream1",
            "cam2": "rtsp://user:password@192.168.1.100:554/stream2"
        }
        with open(CONFIG_FILE, 'w') as f:
            json.dump(default_config, f, indent=2)
        logger.info(f"Please edit {CONFIG_FILE} with your actual RTSP camera URLs")
        return default_config
    
    try:
        with open(CONFIG_FILE, 'r') as f:
            config = json.load(f)
        logger.info(f"Loaded camera config: {list(config.keys())} cameras")
        return config
    except Exception as e:
        logger.error(f"Error loading camera config: {e}")
        return {}


def generate_hls_urls(local_ip: str, camera_config: Dict[str, str]) -> Dict[str, str]:
    """
    Generate HLS URLs for each camera.
    Assumes HLS streams are served at http://<ip>/hls/<camera_name>.m3u8
    """
    hls_urls = {}
    for cam_name in camera_config.keys():
        hls_url = f"http://{local_ip}/hls/{cam_name}.m3u8"
        hls_urls[cam_name] = hls_url
        logger.info(f"Generated HLS URL for {cam_name}: {hls_url}")
    return hls_urls


def update_device_info(device_id: str, owner_uid: str, device_name: str, zone: str, local_ip: str) -> bool:
    """
    Update device_info in Firebase.
    Path: /users/<owner_uid>/devices/<device_id>/device_info/
    """
    device_info = {
        "device_id": device_id,
        "type": "camera_server",
        "name": device_name,
        "zone": zone,
        "ip_address": local_ip,
        "firmware_version": "1.0.0",
        "last_online": int(time.time() * 1000)  # milliseconds timestamp
    }
    
    path = f"users/{owner_uid}/devices/{device_id}/device_info"
    return firebase_put(path, device_info)


def publish_camera_feeds(device_id: str, owner_uid: str, hls_urls: Dict[str, str]) -> bool:
    """
    Publish camera feed URLs to Firebase.
    Path: /users/<owner_uid>/devices/<device_id>/camera_feeds/
    """
    path = f"users/{owner_uid}/devices/{device_id}/camera_feeds"
    return firebase_put(path, hls_urls)


def get_device_info_from_registry(device_id: str) -> Optional[Dict[str, Any]]:
    """
    Get device info from device_registry (name, zone, etc.)
    """
    device_data = firebase_get(f"device_registry/{device_id}")
    if device_data:
        return {
            "name": device_data.get("name", "Unknown Camera Server"),
            "zone": device_data.get("zone", "Unknown Zone")
        }
    return None


def main():
    """
    Main execution loop for Raspberry Pi device manager.
    """
    logger.info("=" * 60)
    logger.info("Raspberry Pi Device Manager Starting...")
    logger.info("=" * 60)
    
    # Generate device ID
    device_id = get_device_id()
    logger.info(f"Device ID: {device_id}")
    
    # Get local IP
    local_ip = get_local_ip()
    logger.info(f"Local IP: {local_ip}")
    
    # Load camera configuration
    camera_config = load_camera_config()
    if not camera_config:
        logger.error("No camera configuration found. Exiting.")
        return
    
    logger.info(f"📹 Camera configuration loaded: {len(camera_config)} camera(s) - {list(camera_config.keys())}")
    
    # Wait until device is claimed
    owner_uid = wait_until_claimed(device_id)
    if not owner_uid:
        logger.error("Failed to get owner UID. Exiting.")
        return
    
    # Get device info from registry
    device_info = get_device_info_from_registry(device_id)
    if device_info:
        device_name = device_info["name"]
        zone = device_info["zone"]
    else:
        logger.warning("Could not get device info from registry, using defaults")
        device_name = "Raspberry Pi Camera Server"
        zone = "Unknown Zone"
    
    # Generate HLS URLs
    hls_urls = generate_hls_urls(local_ip, camera_config)
    logger.info(f"📹 Generated {len(hls_urls)} HLS URL(s): {list(hls_urls.keys())}")
    
    if not hls_urls:
        logger.warning("⚠️  No HLS URLs generated! Check camera_config.json has valid camera entries.")
    
    # Initial update: device_info and camera_feeds
    logger.info("=" * 60)
    logger.info("Publishing initial device information...")
    logger.info("=" * 60)
    logger.info(f"📝 Writing to: /users/{owner_uid}/devices/{device_id}/device_info")
    if update_device_info(device_id, owner_uid, device_name, zone, local_ip):
        logger.info("✅ Device info updated successfully")
    else:
        logger.error("❌ Failed to update device info")
        logger.error("⚠️  Make sure Firebase security rules allow unauthenticated writes to device_info")
        logger.error("⚠️  The rule should be: 'device_info': { '.write': true }")
    
    if hls_urls:
        logger.info(f"📹 Writing to: /users/{owner_uid}/devices/{device_id}/camera_feeds")
        logger.info(f"📹 Publishing {len(hls_urls)} camera feed(s): {list(hls_urls.keys())}")
        if publish_camera_feeds(device_id, owner_uid, hls_urls):
            logger.info("✅ Camera feeds published successfully")
            logger.info(f"📹 Camera feeds available at: {list(hls_urls.values())}")
        else:
            logger.error("❌ Failed to publish camera feeds")
            logger.error("⚠️  Make sure Firebase security rules allow unauthenticated writes to camera_feeds")
    else:
        logger.warning("⚠️  Skipping camera feed publishing - no HLS URLs generated")
        logger.warning("⚠️  Check camera_config.json and ensure cameras are configured")
    
    # Continuous update loop
    logger.info("Entering continuous update loop...")
    logger.info(f"Updating device_info every {UPDATE_INTERVAL} seconds")
    
    try:
        while True:
            time.sleep(UPDATE_INTERVAL)
            
            # Update device_info (keep last_online current)
            logger.debug("Updating device_info...")
            update_device_info(device_id, owner_uid, device_name, zone, local_ip)
            
            # Re-check device info from registry (in case user updated name/zone)
            updated_info = get_device_info_from_registry(device_id)
            if updated_info:
                device_name = updated_info["name"]
                zone = updated_info["zone"]
            
            # Re-publish camera feeds (in case IP changed)
            current_ip = get_local_ip()
            if current_ip != local_ip:
                logger.info(f"IP address changed: {local_ip} → {current_ip}")
                local_ip = current_ip
                hls_urls = generate_hls_urls(local_ip, camera_config)
                publish_camera_feeds(device_id, owner_uid, hls_urls)
            
    except KeyboardInterrupt:
        logger.info("Received interrupt signal. Shutting down...")
    except Exception as e:
        logger.error(f"Unexpected error in main loop: {e}", exc_info=True)


if __name__ == "__main__":
    main()

