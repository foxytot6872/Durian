#!/usr/bin/env python3
"""
HLS File Uploader
Uploads HLS segments from Raspberry Pi to VPS server via rsync/SSH.

This script monitors the local HLS directory and uploads new/changed files
to the VPS server in real-time.
"""

import json
import logging
import os
import subprocess
import time
from pathlib import Path
from typing import Dict, Optional

# Configuration
CONFIG_FILE = Path(__file__).parent / "vps_config.json"
LOCAL_HLS_DIR = Path("/var/www/html/hls")
LOG_FILE = Path(__file__).parent / "hls_uploader.log"

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


def load_vps_config() -> Optional[Dict]:
    """Load VPS configuration from JSON file."""
    if not CONFIG_FILE.exists():
        logger.error(f"VPS config file not found: {CONFIG_FILE}")
        logger.info("Creating default vps_config.json...")
        default_config = {
            "vps_host": "your-vps-ip-or-domain.com",
            "vps_user": "your-vps-username",
            "vps_port": 22,
            "vps_hls_path": "/var/www/html/hls",
            "vps_public_url": "https://your-domain.com",
            "ssh_key_path": "/home/pi/.ssh/vps_hls_key",
            "upload_interval": 1
        }
        with open(CONFIG_FILE, 'w') as f:
            json.dump(default_config, f, indent=2)
        logger.info(f"Please edit {CONFIG_FILE} with your VPS details")
        return None
    
    try:
        with open(CONFIG_FILE, 'r') as f:
            config = json.load(f)
        logger.info(f"Loaded VPS config: {config['vps_host']}")
        return config
    except Exception as e:
        logger.error(f"Error loading VPS config: {e}")
        return None


def upload_hls_files(config: Dict) -> bool:
    """
    Upload HLS files to VPS using rsync over SSH.
    
    Returns True if successful, False otherwise.
    """
    vps_host = config['vps_host']
    vps_user = config['vps_user']
    vps_port = config.get('vps_port', 22)
    vps_hls_path = config['vps_hls_path']
    ssh_key = config.get('ssh_key_path', '~/.ssh/vps_hls_key')
    
    # Expand user path
    ssh_key = os.path.expanduser(ssh_key)
    
    # Build rsync command
    # -r: recursive
    # -l: preserve symlinks
    # -v: verbose
    # -z: compress during transfer
    # --no-perms: don't preserve permissions (uploader can't change them)
    # --no-owner: don't preserve owner (files will be owned by uploader, then chowned by VPS)
    # --no-times: don't preserve timestamps (uploader can't change them)
    # --delete: delete files on VPS that don't exist locally
    # --ignore-missing-args: ignore missing source files (FFmpeg deletes old segments)
    # --exclude: exclude temporary files
    ssh_options = [
        'ssh',
        '-i', ssh_key,
        '-p', str(vps_port),
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'ServerAliveInterval=30',
        '-o', 'ServerAliveCountMax=3',
        '-o', 'ConnectTimeout=10'
    ]
    
    rsync_cmd = [
        'rsync',
        '-rlvz',  # Use -rlvz instead of -avz (no archive mode to avoid permission/time issues)
        '--no-perms',  # Don't try to preserve permissions (uploader can't set them)
        '--no-owner',  # Don't try to preserve owner (files owned by www-data on VPS)
        '--no-times',  # Don't try to preserve timestamps (uploader can't set them)
        '--delete',
        '--ignore-missing-args',  # Ignore files that vanish during transfer (FFmpeg deletes old segments)
        '--exclude', '*.tmp',
        '--exclude', '*.lock',
        '-e', ' '.join(ssh_options),
        f'{LOCAL_HLS_DIR}/',
        f'{vps_user}@{vps_host}:{vps_hls_path}/'
    ]
    
    try:
        logger.debug(f"Running rsync: {' '.join(rsync_cmd)}")
        result = subprocess.run(
            rsync_cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            logger.info("✅ HLS files uploaded successfully")
            return True
        elif result.returncode == 24:
            # Exit code 24: Some files vanished (FFmpeg deleted old segments during transfer)
            # This is expected and harmless - segments are deleted by FFmpeg while rsync is uploading
            logger.info("✅ HLS files uploaded (some files vanished - expected with HLS segment deletion)")
            return True
        elif result.returncode == 255:
            logger.error("❌ Rsync error 255: SSH connection failed (network timeout or refused)")
            if result.stderr:
                logger.error(f"SSH stderr: {result.stderr.strip()}")
            return False
        else:
            logger.warning(f"⚠️ Rsync returned code {result.returncode}")
            if result.stderr:
                logger.warning(f"Stderr: {result.stderr}")
            if result.stdout:
                logger.debug(f"Stdout: {result.stdout}")
            return False
            
    except subprocess.TimeoutExpired:
        logger.error("❌ Rsync upload timed out")
        return False
    except Exception as e:
        logger.error(f"❌ Error uploading HLS files: {e}")
        return False


def test_vps_connection(config: Dict) -> bool:
    """Test SSH connection to VPS."""
    vps_host = config['vps_host']
    vps_user = config['vps_user']
    vps_port = config.get('vps_port', 22)
    ssh_key = config.get('ssh_key_path', '~/.ssh/vps_hls_key')
    ssh_key = os.path.expanduser(ssh_key)
    
    ssh_cmd = [
        'ssh',
        '-i', ssh_key,
        '-p', str(vps_port),
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'ConnectTimeout=5',
        f'{vps_user}@{vps_host}',
        'echo "Connection successful"'
    ]
    
    try:
        result = subprocess.run(
            ssh_cmd,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            logger.info("✅ VPS connection test successful")
            return True
        else:
            logger.error(f"❌ VPS connection test failed: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"❌ VPS connection test error: {e}")
        return False


def main():
    """Main upload loop."""
    logger.info("=" * 60)
    logger.info("HLS Uploader Starting...")
    logger.info("=" * 60)
    
    # Load VPS configuration
    config = load_vps_config()
    if not config:
        logger.error("Cannot start without VPS configuration")
        return
    
    # Verify local HLS directory exists
    if not LOCAL_HLS_DIR.exists():
        logger.error(f"Local HLS directory not found: {LOCAL_HLS_DIR}")
        logger.info("Creating directory...")
        LOCAL_HLS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Test VPS connection
    logger.info("Testing VPS connection...")
    if not test_vps_connection(config):
        logger.error("Cannot connect to VPS. Check configuration and network.")
        return
    
    upload_interval = config.get('upload_interval', 2)
    max_backoff = 60  # seconds
    consecutive_failures = 0
    current_interval = upload_interval
    
    logger.info(f"Starting upload loop (interval: {upload_interval} seconds)")
    
    try:
        while True:
            # Upload HLS files
            success = upload_hls_files(config)
            
            if success:
                consecutive_failures = 0
                current_interval = upload_interval
            else:
                consecutive_failures += 1
                current_interval = min(upload_interval * (2 ** consecutive_failures), max_backoff)
                logger.warning(
                    f"Upload failed (attempt #{consecutive_failures}). "
                    f"Retrying in {current_interval} seconds..."
                )
            
            # Wait before next upload
            time.sleep(current_interval)
            
    except KeyboardInterrupt:
        logger.info("Received interrupt signal. Shutting down...")
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)


if __name__ == "__main__":
    main()

