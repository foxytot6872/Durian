#!/bin/bash
# Check Nginx Headers for HLS Files

echo "=== Checking Nginx Headers ==="
echo ""

echo "1. Content-Type header:"
curl -I http://localhost/hls/cam1.m3u8 2>/dev/null | grep -i content-type
echo ""

echo "2. Full headers:"
curl -I http://localhost/hls/cam1.m3u8 2>/dev/null
echo ""

echo "3. Playlist content (first 10 lines):"
curl http://localhost/hls/cam1.m3u8 2>/dev/null | head -10
echo ""

echo "4. Checking Nginx config for types block:"
sudo nginx -T 2>/dev/null | grep -A 5 "location /hls/" | grep -A 5 "types"
echo ""

echo "=== If Content-Type is missing, fix Nginx config ==="

