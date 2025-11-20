#!/usr/bin/env python3
"""
FFmpeg HLS Launcher
Converts RTSP camera streams to HLS format for web playback.

This script reads camera_config.json and launches FFmpeg processes
to convert each RTSP stream to HLS (.m3u8) format.
"""

import json
import logging
import os
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
# Store process start times for timeout detection
process_start_times = {}
process_last_output_times = {}


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
           -f hls -hls_time 1 -hls_list_size 10 -hls_flags delete_segments \
           -hls_segment_filename <output_dir>/<cam_name>_%03d.ts \
           <output_dir>/<cam_name>.m3u8
    """
    output_m3u8 = HLS_OUTPUT_DIR / f"{cam_name}.m3u8"
    segment_pattern = HLS_OUTPUT_DIR / f"{cam_name}_%03d.ts"
    
    ffmpeg_cmd = [
        'ffmpeg',
        '-rtsp_transport', 'tcp',  # Use TCP for RTSP (more reliable)
        # The monitoring script will handle reconnection by restarting FFmpeg if it stops
        '-i', rtsp_url,
        '-c:v', 'copy',  # Copy video codec (no re-encoding)
        '-c:a', 'aac',  # Convert audio to AAC
        '-b:a', '128k',  # Audio bitrate
        '-f', 'hls',  # Output format: HLS
        '-hls_time', '2',  # Segment duration (2 seconds) - matches upload interval better
        '-hls_list_size', '5',  # Keep 5 segments in playlist (10 seconds buffer)
        '-hls_flags', 'delete_segments+program_date_time',  # Delete old segments, add timestamps
        '-hls_segment_filename', str(segment_pattern),
        '-fflags', '+genpts+igndts',  # Generate PTS, ignore DTS (fixes timestamp warnings)
        '-vsync', 'cfr',  # Constant frame rate (helps with timestamp synchronization)
        '-r', '30',  # Force 30fps (helps with timestamp issues)
        '-y',  # Overwrite output files
        str(output_m3u8)
    ]
    
    try:
        logger.info(f"Starting FFmpeg for {cam_name}...")
        logger.debug(f"Command: {' '.join(ffmpeg_cmd)}")
        
        # Create error log file for this camera
        error_log_file = LOG_FILE.parent / f"ffmpeg_{cam_name}_error.log"
        error_log_handle = open(error_log_file, 'a')
        
        process = subprocess.Popen(
            ffmpeg_cmd,
            stdout=subprocess.PIPE,
            stderr=error_log_handle,  # Log errors to file
            text=True,
            bufsize=1  # Line buffered
        )
        
        # Wait a moment to see if FFmpeg starts successfully
        time.sleep(3)
        if process.poll() is not None:
            # Process died immediately
            exit_code = process.returncode
            logger.error(f"❌ FFmpeg for {cam_name} died immediately (exit code: {exit_code})")
            
            # Read and log the error
            error_log_handle.close()
            if error_log_file.exists():
                try:
                    with open(error_log_file, 'r') as f:
                        error_lines = f.readlines()[-30:]  # Last 30 lines
                        if error_lines:
                            logger.error(f"FFmpeg error output for {cam_name}:")
                            for line in error_lines:
                                logger.error(f"  {line.strip()}")
                except Exception as e:
                    logger.warning(f"Could not read error log: {e}")
            return  # Don't add to processes list if it died immediately
        
        error_log_handle.close()  # Close handle, FFmpeg will continue writing to file
        
        ffmpeg_processes[cam_name] = process
        process_start_times[cam_name] = time.time()
        process_last_output_times[cam_name] = time.time()
        logger.info(f"✅ FFmpeg started for {cam_name} (PID: {process.pid})")
        logger.info(f"📝 Error logs: {error_log_file}")
        
    except Exception as e:
        logger.error(f"Failed to start FFmpeg for {cam_name}: {e}")
        if 'error_log_handle' in locals():
            error_log_handle.close()


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
            if cam_name in process_start_times:
                del process_start_times[cam_name]
            if cam_name in process_last_output_times:
                del process_last_output_times[cam_name]


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
    current_time = time.time()
    
    for cam_name, process in list(ffmpeg_processes.items()):
        # Check if process has died
        if process.poll() is not None:
            exit_code = process.returncode
            logger.warning(f"FFmpeg process for {cam_name} has died (exit code: {exit_code}).")
            
            # Read error log to see what went wrong
            error_log_file = LOG_FILE.parent / f"ffmpeg_{cam_name}_error.log"
            if error_log_file.exists():
                try:
                    with open(error_log_file, 'r') as f:
                        error_lines = f.readlines()[-20:]  # Last 20 lines
                        if error_lines:
                            logger.error(f"FFmpeg error log for {cam_name}:")
                            for line in error_lines:
                                logger.error(f"  {line.strip()}")
                except Exception as e:
                    logger.warning(f"Could not read error log: {e}")
            
            # Reload config and restart
            config = load_camera_config()
            if cam_name in config:
                stop_ffmpeg_stream(cam_name)
                time.sleep(5)  # Wait longer before restart to avoid rapid loops
                logger.info(f"🔄 Restarting FFmpeg for {cam_name}...")
                start_ffmpeg_stream(cam_name, config[cam_name])
            continue
        
        # Check process runtime timeout (if process runs too long without output, might be stuck)
        if cam_name in process_start_times:
            process_runtime = current_time - process_start_times[cam_name]
            # If process has been running for more than 5 minutes without output update, restart
            if cam_name in process_last_output_times:
                time_since_last_output = current_time - process_last_output_times[cam_name]
                if time_since_last_output > 300:  # 5 minutes timeout
                    logger.warning(f"⏱️ FFmpeg for {cam_name} timeout: No output for {time_since_last_output:.1f} seconds. Restarting...")
                    config = load_camera_config()
                    if cam_name in config:
                        stop_ffmpeg_stream(cam_name)
                        time.sleep(3)
                        start_ffmpeg_stream(cam_name, config[cam_name])
                    continue
        
        # Check if output file is being updated (process might be stuck/hung)
        output_m3u8 = HLS_OUTPUT_DIR / f"{cam_name}.m3u8"
        if output_m3u8.exists():
            try:
                file_mtime = os.path.getmtime(output_m3u8)
                file_age = current_time - file_mtime
                
                # Update last output time if file was recently modified
                if file_age < 5:  # File updated in last 5 seconds
                    process_last_output_times[cam_name] = current_time
                
                # If file hasn't been updated in 15 seconds, process might be stuck
                if file_age > 15:
                    logger.warning(f"⏱️ FFmpeg output for {cam_name} hasn't updated in {file_age:.1f} seconds. Process may be stuck. Restarting...")
                    config = load_camera_config()
                    if cam_name in config:
                        stop_ffmpeg_stream(cam_name)
                        time.sleep(3)
                        start_ffmpeg_stream(cam_name, config[cam_name])
            except Exception as e:
                logger.debug(f"Could not check file age for {cam_name}: {e}")
        else:
            # File doesn't exist - check if process has been running for a while
            if cam_name in process_start_times:
                process_runtime = current_time - process_start_times[cam_name]
                # If process running for 30+ seconds but no output file, restart
                if process_runtime > 30:
                    logger.warning(f"⏱️ FFmpeg for {cam_name} running for {process_runtime:.1f}s but no output file. Restarting...")
                    config = load_camera_config()
                    if cam_name in config:
                        stop_ffmpeg_stream(cam_name)
                        time.sleep(3)
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
            time.sleep(5)  # Check every 5 seconds (more frequent monitoring)
            check_ffmpeg_processes()
    except KeyboardInterrupt:
        signal_handler(None, None)


if __name__ == "__main__":
    main()

