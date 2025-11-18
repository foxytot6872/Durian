#!/usr/bin/env python3
"""
FFmpeg HLS Launcher
Converts RTSP camera streams to HLS format for web playback.

This script reads camera_config.json and launches FFmpeg processes
to convert each RTSP stream to HLS (.m3u8) format.
"""

import json
import logging
import subprocess
import signal
import sys
import time
from pathlib import Path
from typing import Dict

# Configuration
CONFIG_FILE = Path(__file__).parent / "camera_config.json"
HLS_OUTPUT_DIR = Path("/var/www/html/hls")  # Web-accessible directory
LOG_FILE = Path(__file__).parent / "ffmpeg_hls.log"

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

# Store FFmpeg processes
ffmpeg_processes = {}


def load_camera_config() -> Dict[str, str]:
    """Load camera configuration from JSON file."""
    if not CONFIG_FILE.exists():
        logger.error(f"Camera config file not found: {CONFIG_FILE}")
        return {}
    
    try:
        with open(CONFIG_FILE, 'r') as f:
            config = json.load(f)
        logger.info(f"Loaded {len(config)} camera configurations")
        return config
    except Exception as e:
        logger.error(f"Error loading camera config: {e}")
        return {}


def create_hls_output_dir():
    """Create HLS output directory if it doesn't exist."""
    HLS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(f"HLS output directory: {HLS_OUTPUT_DIR}")


def start_ffmpeg_stream(cam_name: str, rtsp_url: str):
    """
    Start FFmpeg process to convert RTSP to HLS.
    
    FFmpeg command:
    ffmpeg -rtsp_transport tcp -i <rtsp_url> \
           -c:v copy -c:a aac -b:a 128k \
           -f hls -hls_time 2 -hls_list_size 3 -hls_flags delete_segments \
           -hls_segment_filename <output_dir>/<cam_name>_%03d.ts \
           <output_dir>/<cam_name>.m3u8
    """
    output_m3u8 = HLS_OUTPUT_DIR / f"{cam_name}.m3u8"
    segment_pattern = HLS_OUTPUT_DIR / f"{cam_name}_%03d.ts"
    
    ffmpeg_cmd = [
        'ffmpeg',
        '-rtsp_transport', 'tcp',  # Use TCP for RTSP (more reliable)
        '-i', rtsp_url,
        '-c:v', 'copy',  # Copy video codec (no re-encoding)
        '-c:a', 'aac',  # Convert audio to AAC
        '-b:a', '128k',  # Audio bitrate
        '-f', 'hls',
        '-hls_time', '2',  # Segment duration (2 seconds)
        '-hls_list_size', '3',  # Keep 3 segments in playlist
        '-hls_flags', 'delete_segments',  # Delete old segments
        '-hls_segment_filename', str(segment_pattern),
        str(output_m3u8)
    ]
    
    try:
        logger.info(f"Starting FFmpeg for {cam_name}...")
        logger.debug(f"Command: {' '.join(ffmpeg_cmd)}")
        
        process = subprocess.Popen(
            ffmpeg_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        ffmpeg_processes[cam_name] = process
        logger.info(f"✅ FFmpeg started for {cam_name} (PID: {process.pid})")
        
    except Exception as e:
        logger.error(f"Failed to start FFmpeg for {cam_name}: {e}")


def stop_ffmpeg_stream(cam_name: str):
    """Stop FFmpeg process for a camera."""
    if cam_name in ffmpeg_processes:
        process = ffmpeg_processes[cam_name]
        try:
            process.terminate()
            process.wait(timeout=5)
            logger.info(f"Stopped FFmpeg for {cam_name}")
        except subprocess.TimeoutExpired:
            process.kill()
            logger.warning(f"Force killed FFmpeg for {cam_name}")
        except Exception as e:
            logger.error(f"Error stopping FFmpeg for {cam_name}: {e}")
        finally:
            del ffmpeg_processes[cam_name]


def stop_all_streams():
    """Stop all FFmpeg processes."""
    logger.info("Stopping all FFmpeg streams...")
    for cam_name in list(ffmpeg_processes.keys()):
        stop_ffmpeg_stream(cam_name)


def signal_handler(sig, frame):
    """Handle shutdown signals."""
    logger.info("Received shutdown signal. Stopping all streams...")
    stop_all_streams()
    sys.exit(0)


def check_ffmpeg_processes():
    """Check if FFmpeg processes are still running, restart if needed."""
    for cam_name, process in list(ffmpeg_processes.items()):
        if process.poll() is not None:
            # Process has died
            logger.warning(f"FFmpeg process for {cam_name} has died. Restarting...")
            # Reload config and restart
            config = load_camera_config()
            if cam_name in config:
                stop_ffmpeg_stream(cam_name)
                start_ffmpeg_stream(cam_name, config[cam_name])


def main():
    """Main execution."""
    logger.info("=" * 60)
    logger.info("FFmpeg HLS Launcher Starting...")
    logger.info("=" * 60)
    
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Create output directory
    create_hls_output_dir()
    
    # Load camera configuration
    camera_config = load_camera_config()
    if not camera_config:
        logger.error("No camera configuration found. Exiting.")
        return
    
    # Start FFmpeg for each camera
    logger.info(f"Starting {len(camera_config)} camera streams...")
    for cam_name, rtsp_url in camera_config.items():
        start_ffmpeg_stream(cam_name, rtsp_url)
        time.sleep(1)  # Small delay between starts
    
    logger.info("All camera streams started. Monitoring processes...")
    
    # Monitor processes
    try:
        while True:
            time.sleep(10)  # Check every 10 seconds
            check_ffmpeg_processes()
    except KeyboardInterrupt:
        signal_handler(None, None)


if __name__ == "__main__":
    main()

