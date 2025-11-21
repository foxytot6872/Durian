// Zone Navigation JavaScript

class ZoneNavigationManager {
    constructor() {
        this.zoneData = this.initializeZoneData();
        this.init();
    }
    
    init() {
        this.setupZoneClickHandlers();
        this.setupHoverEffects();
    }
    
    initializeZoneData() {
        const data = new Map();
        
        data.set('A', {
            name: 'North Field',
            description: 'Monitoring durian trees and soil conditions',
            metrics: {
                'Soil Moisture': '68%',
                'Temperature': '27°C',
                'Humidity': '75%',
                'Last Update': '2 hours ago'
            }
        });
        
        data.set('B', {
            name: 'South Field',
            description: 'Monitoring durian trees and soil conditions',
            metrics: {
                'Soil Moisture': '62%',
                'Temperature': '29°C',
                'Humidity': '70%',
                'Last Update': '1 hour ago'
            }
        });
        
        data.set('C', {
            name: 'East Field',
            description: 'Monitoring durian trees and soil conditions',
            metrics: {
                'Soil Moisture': '45%',
                'Temperature': '32°C',
                'Humidity': '65%',
                'Last Update': '30 minutes ago'
            }
        });
        
        data.set('D', {
            name: 'West Field',
            description: 'Monitoring durian trees and soil conditions',
            metrics: {
                'Soil Moisture': '71%',
                'Temperature': '26°C',
                'Humidity': '80%',
                'Last Update': '1 hour ago'
            }
        });
        
        return data;
    }
    
    setupZoneClickHandlers() {
        const zoneCards = document.querySelectorAll('.clickable-zone');
        
        zoneCards.forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleZoneClick(card);
            });
        });
    }
    
    handleZoneClick(card) {
        const zone = card.getAttribute('data-zone');
        const zoneName = card.getAttribute('data-zone-name');
        
        if (!zone || !zoneName) {
            console.error('Zone data not found');
            return;
        }
        
        console.log('Zone clicked:', zone, zoneName);
        
        // Store zone info in localStorage for Map page
        localStorage.setItem('selectedZone', zone);
        localStorage.setItem('selectedZoneName', zoneName);
        
        // Navigate to Map page
        window.location.href = 'Map.html';
    }
    
    setupHoverEffects() {
        const zoneCards = document.querySelectorAll('.clickable-zone');
        
        zoneCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                this.handleZoneHover(card, true);
            });
            
            card.addEventListener('mouseleave', () => {
                this.handleZoneHover(card, false);
            });
        });
    }
    
    handleZoneHover(card, isEntering) {
        if (isEntering) {
            card.style.transform = 'translateY(-5px)';
            card.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
        } else {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        }
    }
    
    getZoneData(zone) {
        return this.zoneData.get(zone);
    }
}

// Camera Feed Manager for Map page
class CameraFeedManager {
    constructor() {
        this.zoneData = this.initializeZoneData();
        this.currentZone = localStorage.getItem('selectedZone') || 'A';
        this.firebaseDashboard = null;
        this.hlsPlayer = null; // HLS player instance for camera feed
        this.currentFeedUrl = null; // Track current feed URL to prevent reloading
        this.isLoadingFeed = false; // Prevent multiple simultaneous loads
        this.init();
    }
    
    init() {
        // Wait for Firebase Dashboard Manager to be available
        this.waitForFirebase();
        this.updateZoneContent();
        this.setupCameraControls();
    }

    waitForFirebase() {
        // Check if Firebase Dashboard Manager is available
        if (window.firebaseDashboard) {
            this.firebaseDashboard = window.firebaseDashboard;
            this.setupFirebaseListener();
        } else {
            // Retry after a delay
            setTimeout(() => this.waitForFirebase(), 500);
        }
    }

    setupFirebaseListener() {
        // Listen for device updates from Firebase Dashboard Manager
        if (this.firebaseDashboard) {
            // Register callback to be notified when data updates
            this.firebaseDashboard.onUpdate(() => {
                this.updateZoneMetricsFromFirebase();
                this.setupCameraFeed(); // Update camera feed
                this.generateStatusCards(); // Update status cards
                this.updateFieldStatusTable(); // Update field status table
            });
            
            // Also set up polling as backup (updates every 5 seconds)
            setInterval(() => {
                this.updateZoneMetricsFromFirebase();
                this.setupCameraFeed(); // Update camera feed
                this.generateStatusCards(); // Update status cards
                this.updateFieldStatusTable(); // Update field status table
            }, 5000);
            
            // Initial update
            this.updateZoneMetricsFromFirebase();
            this.setupCameraFeed(); // Initial camera feed
            this.generateStatusCards(); // Initial status cards
            this.updateFieldStatusTable(); // Initial field status table
        }
    }

    updateZoneMetricsFromFirebase() {
        if (!this.firebaseDashboard) return;

        // Get devices for the current zone
        const zoneName = `Zone ${this.currentZone}`;
        const devices = this.firebaseDashboard.getDevicesByZone(zoneName);

        if (devices.length === 0) {
            console.log(`No devices found for ${zoneName}`);
            // Show empty state instead of static data
            const metricsContainer = document.getElementById('zoneMetrics');
            if (metricsContainer) {
                const loadingState = document.getElementById('zoneMetricsLoading');
                if (loadingState) {
                    loadingState.innerHTML = '<p style="color: #718096;">No devices found for this zone</p>';
                }
            }
            return;
        }

        // Use the first device's sensor data (or average if multiple)
        const device = devices[0];
        
        // Update zone title and description with device info
        this.updateZoneHeader(device, zoneName);

        // Setup camera feed if available
        this.setupCameraFeed();

        if (!device.sensorData) {
            console.log(`No sensor data for device ${device.name}`);
            return;
        }

        // Update zone metrics with real Firebase data
        this.updateZoneMetricsWithFirebaseData(device.sensorData, device);
    }

    updateZoneHeader(device, zoneName) {
        // Update zone title
        const zoneTitle = document.getElementById('zoneTitle');
        if (zoneTitle && device) {
            zoneTitle.textContent = `${zoneName} - ${device.name || 'Sensor'}`;
        }

        // Update camera title
        const cameraTitle = document.getElementById('cameraTitle');
        if (cameraTitle && device) {
            cameraTitle.textContent = `${zoneName} - ${device.name || 'Sensor'} Live Feed`;
        }
    }

    /**
     * Setup camera feed for the current zone
     * Looks for Pi devices in the zone and displays their camera feeds
     */
    setupCameraFeed() {
        if (!this.firebaseDashboard) return;
        
        // Prevent multiple simultaneous loads
        if (this.isLoadingFeed) return;

        const zoneName = `Zone ${this.currentZone}`;
        const devices = this.firebaseDashboard.getDevicesByZone(zoneName);

        // Find camera devices (Pi devices) in this zone
        const cameraDevices = devices.filter(device => device.type === 'camera_server');
        
        if (cameraDevices.length === 0) {
            // No camera devices in this zone
            const videoElement = document.getElementById('cameraVideo');
            const placeholder = document.getElementById('cameraPlaceholder');
            if (videoElement) videoElement.style.display = 'none';
            if (placeholder) {
                placeholder.style.display = 'flex';
                const statusValue = placeholder.querySelector('.stat-value.live');
                if (statusValue) statusValue.textContent = 'No Camera';
            }
            // Clear current feed URL since no camera available
            this.currentFeedUrl = null;
            return;
        }

        // Use first camera device
        const cameraDevice = cameraDevices[0];
        const cameraFeeds = cameraDevice.cameraFeeds || {};
        const feedNames = Object.keys(cameraFeeds);
        
        if (feedNames.length === 0) {
            // Device exists but no feeds yet
            const videoElement = document.getElementById('cameraVideo');
            const placeholder = document.getElementById('cameraPlaceholder');
            if (videoElement) videoElement.style.display = 'none';
            if (placeholder) {
                placeholder.style.display = 'flex';
                const statusValue = placeholder.querySelector('.stat-value.live');
                if (statusValue) statusValue.textContent = 'No Feeds';
            }
            // Clear current feed URL since no feeds available
            this.currentFeedUrl = null;
            return;
        }

        // Get first feed URL
        const firstFeedUrl = cameraFeeds[feedNames[0]];
        console.log('📹 Camera feed URL:', firstFeedUrl);
        console.log('📹 Camera device:', cameraDevice.name, '| Zone:', zoneName);
        console.log('📹 Available feeds:', feedNames);
        
        // Only load if URL has changed
        if (firstFeedUrl === this.currentFeedUrl && this.hlsPlayer) {
            // Same feed already playing, don't reload
            console.log('✅ Same feed already playing, skipping reload');
            return;
        }
        
        this.loadCameraFeed(firstFeedUrl);
    }

    /**
     * Convert HTTP URL to HTTPS to avoid mixed content errors
     * Note: This requires the server to support HTTPS
     */
    convertToHttps(url) {
        if (!url) return url;
        // If URL starts with http://, convert to https://
        if (url.startsWith('http://')) {
            const httpsUrl = url.replace('http://', 'https://');
            console.log('🔄 Converting HTTP to HTTPS:', url, '→', httpsUrl);
            return httpsUrl;
        }
        return url;
    }

    /**
     * Load and play HLS camera feed
     */
    loadCameraFeed(feedUrl) {
        const videoElement = document.getElementById('cameraVideo');
        const placeholder = document.getElementById('cameraPlaceholder');
        
        if (!videoElement || !feedUrl) {
            console.warn('⚠️ Cannot load camera feed: missing video element or feed URL');
            return;
        }
        
        // Convert HTTP to HTTPS if page is loaded over HTTPS (to avoid mixed content errors)
        // Note: This requires the VPS server to support HTTPS
        if (window.location.protocol === 'https:' && feedUrl.startsWith('http://')) {
            feedUrl = this.convertToHttps(feedUrl);
            console.warn('⚠️ Mixed content detected: HTTP URL on HTTPS page. Converted to HTTPS.');
            console.warn('⚠️ Make sure your VPS server (161.118.209.162) supports HTTPS, or set up SSL certificate.');
        }
        
        console.log('🎥 Loading camera feed:', feedUrl);
        console.log('🎥 Current feed URL:', this.currentFeedUrl);
        console.log('🎥 Is loading:', this.isLoadingFeed);
        
        // Prevent multiple simultaneous loads
        if (this.isLoadingFeed) {
            console.log('⏳ Camera feed load already in progress, skipping...');
            return;
        }
        
        // If same URL is already playing, don't reload
        if (feedUrl === this.currentFeedUrl && this.hlsPlayer) {
            console.log('✅ Same camera feed already playing, skipping reload');
            return;
        }

        this.isLoadingFeed = true;
        this.currentFeedUrl = feedUrl;
        console.log('🔄 Starting new camera feed load:', feedUrl);

        // Cleanup existing HLS player
        if (this.hlsPlayer) {
            try {
                this.hlsPlayer.destroy();
            } catch (e) {
                console.warn('Warning cleaning up HLS player:', e);
            }
            this.hlsPlayer = null;
        }

        // Check if HLS is supported
        if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
                maxBufferLength: 30, // Reduce buffer to prevent looping
                maxMaxBufferLength: 60
            });

            hls.loadSource(feedUrl);
            hls.attachMedia(videoElement);

            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                console.log('✅ HLS manifest parsed for:', feedUrl);
                console.log('✅ Available levels:', data.levels);
                console.log('✅ Video element ready, attempting playback');
                this.isLoadingFeed = false;
                videoElement.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
                
                // Try to play
                const playPromise = videoElement.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log('✅ Video playback started');
                        })
                        .catch(err => {
                            // Autoplay prevention is normal, user can click to play
                            console.log('ℹ️ Autoplay prevented (user interaction required):', err.message);
                            // Show play button or message to user
                            if (placeholder) {
                                placeholder.style.display = 'block';
                                placeholder.innerHTML = '<p>Click to play video</p>';
                                placeholder.onclick = () => videoElement.play();
                            }
                        });
                }
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.error('❌ HLS error:', data);
                    this.isLoadingFeed = false;
                    
                    // Check for mixed content or CORS errors
                    if (data.details && (
                        data.details.includes('Mixed Content') || 
                        data.details.includes('CORS') ||
                        data.message && data.message.includes('Mixed Content')
                    )) {
                        console.error('❌ Mixed Content Error: The VPS server needs to support HTTPS.');
                        console.error('❌ Please configure SSL certificate on your VPS server (161.118.209.162)');
                        if (placeholder) {
                            placeholder.style.display = 'flex';
                            placeholder.innerHTML = `
                                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                                <h3>Mixed Content Error</h3>
                                <p>The camera server must use HTTPS. Please configure SSL on your VPS server.</p>
                                <p style="font-size: 0.9rem; color: #64748b;">Server: 161.118.209.162</p>
                            `;
                        }
                        hls.destroy();
                        this.hlsPlayer = null;
                        this.currentFeedUrl = null;
                        return;
                    }
                    
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.log('🔄 Retrying network error...');
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.log('🔄 Recovering media error...');
                            hls.recoverMediaError();
                            break;
                        default:
                            hls.destroy();
                            this.hlsPlayer = null;
                            this.currentFeedUrl = null;
                            if (placeholder) {
                                placeholder.style.display = 'flex';
                                placeholder.innerHTML = `
                                    <i class="fas fa-video-slash" style="font-size: 4rem; color: #ef4444; margin-bottom: 1rem;"></i>
                                    <h3>Camera Feed Error</h3>
                                    <p>Unable to load camera feed. Please check the server connection.</p>
                                `;
                            }
                            break;
                    }
                } else {
                    // Non-fatal errors (warnings)
                    console.warn('⚠️ HLS warning:', data);
                }
            });

            this.hlsPlayer = hls;
            this.isLoadingFeed = false;
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            this.isLoadingFeed = false;
            videoElement.src = feedUrl;
            videoElement.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
            videoElement.play().catch(err => {
                console.log('ℹ️ Autoplay prevented (user interaction required)');
            });
        } else {
            console.error('❌ HLS not supported');
            this.isLoadingFeed = false;
            if (placeholder) {
                placeholder.style.display = 'flex';
                videoElement.style.display = 'none';
            }
        }
    }
    
    initializeZoneData() {
        const data = new Map();
        
        data.set('A', {
            name: 'North Field',
            description: 'Monitoring durian trees and soil conditions',
            metrics: {
                'Soil Moisture': '68%',
                'Temperature': '27°C',
                'Humidity': '75%',
                'Last Update': '2 hours ago'
            }
        });
        
        data.set('B', {
            name: 'South Field',
            description: 'Monitoring durian trees and soil conditions',
            metrics: {
                'Soil Moisture': '62%',
                'Temperature': '29°C',
                'Humidity': '70%',
                'Last Update': '1 hour ago'
            }
        });
        
        data.set('C', {
            name: 'East Field',
            description: 'Monitoring durian trees and soil conditions',
            metrics: {
                'Soil Moisture': '45%',
                'Temperature': '32°C',
                'Humidity': '65%',
                'Last Update': '30 minutes ago'
            }
        });
        
        data.set('D', {
            name: 'West Field',
            description: 'Monitoring durian trees and soil conditions',
            metrics: {
                'Soil Moisture': '71%',
                'Temperature': '26°C',
                'Humidity': '80%',
                'Last Update': '1 hour ago'
            }
        });
        
        return data;
    }
    
    updateZoneContent() {
        const selectedZone = localStorage.getItem('selectedZone') || 'A';
        const selectedZoneName = localStorage.getItem('selectedZoneName') || 'Loading...';
        
        console.log('Updating zone content for:', selectedZone, selectedZoneName);
        
        // Update titles (will be updated with real data when Firebase loads)
        const zoneTitle = document.getElementById('zoneTitle');
        const cameraTitle = document.getElementById('cameraTitle');
        const cameraDescription = document.getElementById('cameraDescription');
        
        if (zoneTitle) {
            zoneTitle.textContent = `Zone ${selectedZone} - ${selectedZoneName}`;
        }
        
        if (cameraTitle) {
            cameraTitle.textContent = `Zone ${selectedZone} - ${selectedZoneName} Live Feed`;
        }
        
        if (cameraDescription) {
            cameraDescription.textContent = 'Loading zone data...';
        }
        
        // Update zone metrics (will use Firebase data when available)
        this.updateZoneMetrics(selectedZone);
    }
    
    updateZoneMetrics(zone) {
        // First try to get data from Firebase
        if (this.firebaseDashboard) {
            this.updateZoneMetricsFromFirebase();
            return;
        }

        // Show loading state if Firebase not available yet
        const metricsContainer = document.getElementById('zoneMetrics');
        if (!metricsContainer) return;
        
        // Keep loading state visible until Firebase is ready
        const loadingState = document.getElementById('zoneMetricsLoading');
        if (loadingState && !this.firebaseDashboard) {
            // Loading state already shown in HTML, just return
            return;
        }
    }

    updateZoneMetricsWithFirebaseData(sensorData, device) {
        const metricsContainer = document.getElementById('zoneMetrics');
        if (!metricsContainer) return;

        // Remove loading state
        const loadingState = document.getElementById('zoneMetricsLoading');
        if (loadingState) {
            loadingState.remove();
        }

        // Determine zone status based on moisture
        const moisture = sensorData.moisture || 0;
        let status = 'healthy';
        if (moisture < 30) {
            status = 'critical';
        } else if (moisture < 50) {
            status = 'warning';
        }
        
        // Update zone status badge
        const statusBadge = document.getElementById('zoneStatusBadge');
        if (statusBadge) {
            statusBadge.textContent = status === 'healthy' ? 'Active' : status === 'warning' ? 'Warning' : 'Critical';
            statusBadge.className = `zone-badge ${status}`;
        }
        
        metricsContainer.innerHTML = '';
        
        // Format timestamp
        const timestamp = sensorData.timestamp || Date.now();
        const lastUpdate = this.formatTimestamp(timestamp);
        
        // Define metrics with new sensor data fields
        const metrics = [
            { label: 'Soil Moisture', value: `${Math.round(sensorData.moisture || 0)}%`, class: 'moisture', priority: 1 },
            { label: 'Temperature', value: `${Math.round(sensorData.temperature || 0)}°C`, class: 'temperature', priority: 2 },
            { label: 'Electrical Conductivity', value: `${sensorData.ec || 0} µS/cm`, class: 'ec', priority: 3 },
            { label: 'pH Level', value: (sensorData.ph || 0).toFixed(1), class: 'ph', priority: 4 },
            { label: 'Nitrogen (N)', value: `${sensorData.n || 0} mg/kg`, class: 'nitrogen', priority: 5 },
            { label: 'Phosphorus (P)', value: `${sensorData.p || 0} mg/kg`, class: 'phosphorus', priority: 6 },
            { label: 'Potassium (K)', value: `${sensorData.k || 0} mg/kg`, class: 'potassium', priority: 7 },
            { label: 'Last Update', value: lastUpdate, class: 'timestamp', priority: 8 }
        ];
        
        // Sort by priority and render
        metrics.sort((a, b) => a.priority - b.priority);
        
        metrics.forEach(metric => {
            const metricDiv = document.createElement('div');
            metricDiv.className = `zone-metric ${metric.class || ''}`.trim();
            metricDiv.innerHTML = `
                <span class="metric-label">${metric.label}</span>
                <span class="metric-value">${metric.value}</span>
            `;
            metricsContainer.appendChild(metricDiv);
        });
    }

    updateZoneMetricsWithStaticData(data) {
        const metricsContainer = document.getElementById('zoneMetrics');
        if (!metricsContainer) return;
        
        // Determine zone status based on metrics
        const moisture = parseInt(data.metrics['Soil Moisture']) || 0;
        let status = 'healthy';
        if (moisture < 30) {
            status = 'critical';
        } else if (moisture < 50) {
            status = 'warning';
        }
        
        // Update zone status badge
        const statusBadge = document.getElementById('zoneStatusBadge');
        if (statusBadge) {
            statusBadge.textContent = status === 'healthy' ? 'Active' : status === 'warning' ? 'Warning' : 'Critical';
            statusBadge.className = `zone-badge ${status}`;
        }
        
        metricsContainer.innerHTML = '';
        
        // Define metric order and classes
        const metricConfig = {
            'Soil Moisture': { class: 'moisture', priority: 1 },
            'Temperature': { class: 'temperature', priority: 2 },
            'Humidity': { class: 'humidity', priority: 3 },
            'pH': { class: 'ph', priority: 4 },
            'Last Update': { class: '', priority: 5 }
        };
        
        // Sort metrics by priority
        const sortedMetrics = Object.entries(data.metrics).sort((a, b) => {
            const aConfig = metricConfig[a[0]] || { priority: 99 };
            const bConfig = metricConfig[b[0]] || { priority: 99 };
            return aConfig.priority - bConfig.priority;
        });
        
        sortedMetrics.forEach(([label, value]) => {
            const config = metricConfig[label] || {};
            const metricDiv = document.createElement('div');
            metricDiv.className = `zone-metric ${config.class || ''}`.trim();
            metricDiv.innerHTML = `
                <span class="metric-label">${label}</span>
                <span class="metric-value">${value}</span>
            `;
            metricsContainer.appendChild(metricDiv);
        });
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return 'Never';
        
        // If timestamp is in milliseconds (from ESP32 millis())
        // We'll treat it as relative time since boot
        const now = Date.now();
        const diff = now - timestamp;
        
        // If timestamp seems to be from ESP32 (millis since boot), show relative time
        if (diff > 86400000) { // More than 24 hours difference
            // Likely ESP32 millis() - show as "X seconds ago" based on polling
            return 'Just now';
        }
        
        // Otherwise format as time ago
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }
    
    setupCameraControls() {
        // Back button functionality
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }
        
        // Fullscreen functionality
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                const cameraFeed = document.getElementById('cameraFeed');
                if (cameraFeed && cameraFeed.requestFullscreen) {
                    cameraFeed.requestFullscreen();
                }
            });
        }
        
        // Record functionality
        const recordBtn = document.getElementById('recordBtn');
        if (recordBtn) {
            recordBtn.addEventListener('click', () => {
                this.toggleRecording(recordBtn);
            });
        }
        
        // Setup valve controls
        this.setupValveControls();
        
        // Setup status dashboard (will use Firebase data if available)
        this.setupStatusDashboard();
        
        // Update field status table if Firebase is available
        if (this.firebaseDashboard) {
            this.updateFieldStatusTable();
        }
    }
    
    setupValveControls() {
        // Watering valve control
        const wateringValve = document.getElementById('wateringValve');
        if (wateringValve) {
            wateringValve.addEventListener('change', (e) => {
                this.handleValveToggle('watering', e.target.checked);
            });
        }
    }
    
    handleValveToggle(system, isOn) {
        console.log(`${system} valve ${isOn ? 'opened' : 'closed'}`);
        
        // Update valve status indicator
        const statusDot = document.getElementById('valveStatusDot');
        const statusText = document.getElementById('valveStatusText');
        
        if (statusDot && statusText) {
            if (isOn) {
                statusDot.style.background = '#4ba252';
                statusText.textContent = `${system.charAt(0).toUpperCase() + system.slice(1)} Active`;
            } else {
                statusDot.style.background = '#64748b';
                statusText.textContent = 'System Ready';
            }
        }
        
        // Update metrics based on system
        this.updateValveMetrics(system, isOn);
    }
    
    updateValveMetrics(system, isOn) {
        if (system === 'watering' && isOn) {
            // Simulate watering metrics
            const pressureElement = document.getElementById('waterPressure');
            const flowElement = document.getElementById('flowRate');
            
            if (pressureElement) pressureElement.textContent = '2.8 bar';
            if (flowElement) flowElement.textContent = '18 L/min';
        }
        
        if (system === 'fertilizer' && isOn) {
            // Simulate fertilizer metrics
            const levelElement = document.getElementById('fertilizerLevel');
            const concentrationElement = document.getElementById('fertilizerConcentration');
            
            if (levelElement) levelElement.textContent = '72%';
            if (concentrationElement) concentrationElement.textContent = '2.8%';
        }
        
        if (system === 'pestControl' && isOn) {
            // Simulate pest control metrics
            const coverageElement = document.getElementById('sprayCoverage');
            const tankElement = document.getElementById('tankLevel');
            
            if (coverageElement) coverageElement.textContent = '98%';
            if (tankElement) tankElement.textContent = '58%';
        }
    }
    
    setupStatusDashboard() {
        // Setup filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.getAttribute('data-filter');
                this.filterStatusCards(filter);
                
                // Update active button
                filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Generate status cards
        this.generateStatusCards();
    }
    
    generateStatusCards() {
        const statusCardsGrid = document.getElementById('statusCardsGrid');
        if (!statusCardsGrid) return;
        
        // Try to get real data from Firebase first
        if (this.firebaseDashboard) {
            this.generateStatusCardsFromFirebase();
        } else {
            // Keep loading state visible until Firebase is ready
            const loadingState = document.getElementById('statusCardsLoading');
            if (loadingState) {
                // Loading state already shown in HTML, just return
                return;
            }
        }
    }

    generateStatusCardsFromFirebase() {
        const statusCardsGrid = document.getElementById('statusCardsGrid');
        if (!statusCardsGrid || !this.firebaseDashboard) return;

        // Remove loading state
        const loadingState = document.getElementById('statusCardsLoading');
        if (loadingState) {
            loadingState.remove();
        }

        const selectedZone = localStorage.getItem('selectedZone') || 'A';
        const zoneName = `Zone ${selectedZone}`;
        const devices = this.firebaseDashboard.getDevicesByZone(zoneName);

        statusCardsGrid.innerHTML = '';

        if (devices.length === 0) {
            statusCardsGrid.innerHTML = '<p style="padding: 2rem; text-align: center; color: #718096;">No devices found for this zone</p>';
            return;
        }

        // Get sensor data from first device (or aggregate)
        const device = devices[0];
        if (!device || !device.sensorData) {
            statusCardsGrid.innerHTML = '<p style="padding: 2rem; text-align: center; color: #718096;">No sensor data available</p>';
            return;
        }

        const sensorData = device.sensorData;
        const statusCards = [];

        // Watering Status based on moisture
        const moisture = sensorData.moisture || 0;
        let wateringStatus = 'healthy';
        let wateringContent = 'Optimal moisture levels maintained.';
        if (moisture < 30) {
            wateringStatus = 'critical';
            wateringContent = 'Low moisture levels detected. Immediate irrigation required.';
        } else if (moisture < 50) {
            wateringStatus = 'warning';
            wateringContent = 'Moisture levels below optimal. Consider irrigation soon.';
        }

        statusCards.push({
            type: 'watering',
            title: 'Watering Status',
            status: wateringStatus,
            content: wateringContent,
            time: this.formatTimestamp(sensorData.timestamp)
        });

        // Fertilizer Status based on NPK levels
        const n = sensorData.n || 0;
        const p = sensorData.p || 0;
        const k = sensorData.k || 0;
        let fertilizerStatus = 'healthy';
        let fertilizerContent = 'Nutrient levels balanced.';
        
        if (n < 10 || p < 5 || k < 5) {
            fertilizerStatus = 'warning';
            fertilizerContent = `Nutrient levels: N=${n}, P=${p}, K=${k} mg/kg. Consider fertilizer application.`;
        }

        statusCards.push({
            type: 'fertilizer',
            title: 'Fertilizer Status',
            status: fertilizerStatus,
            content: fertilizerContent,
            time: this.formatTimestamp(sensorData.timestamp)
        });

        // Soil Health based on pH and EC
        const ph = sensorData.ph || 0;
        const ec = sensorData.ec || 0;
        let soilStatus = 'healthy';
        let soilContent = 'Soil conditions optimal.';
        
        if (ph < 5.5 || ph > 7.5) {
            soilStatus = 'warning';
            soilContent = `pH level ${ph} is outside optimal range (5.5-7.5).`;
        } else if (ec > 2000) {
            soilStatus = 'warning';
            soilContent = `High electrical conductivity (${ec} µS/cm) detected.`;
        }

        statusCards.push({
            type: 'soil',
            title: 'Soil Health',
            status: soilStatus,
            content: soilContent,
            time: this.formatTimestamp(sensorData.timestamp)
        });

        // Render status cards
        statusCards.forEach(status => {
            const card = this.createStatusCard(status);
            statusCardsGrid.appendChild(card);
        });

        // Also update field status table
        this.updateFieldStatusTable();
    }

    updateFieldStatusTable() {
        const tableBody = document.getElementById('fieldStatusTableBody');
        if (!tableBody || !this.firebaseDashboard) return;

        // Remove loading state
        const loadingRow = document.getElementById('fieldStatusLoading');
        if (loadingRow) {
            loadingRow.remove();
        }

        const allDevices = this.firebaseDashboard.getDevices();
        
        if (allDevices.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: #718096;">No devices found</td></tr>';
            return;
        }

        // Group devices by zone and create table rows
        const devicesByZone = new Map();
        for (const device of allDevices) {
            const zone = device.zone || 'Unknown';
            if (!devicesByZone.has(zone)) {
                devicesByZone.set(zone, []);
            }
            devicesByZone.get(zone).push(device);
        }

        tableBody.innerHTML = '';

        // Create a row for each zone/device
        for (const [zoneName, devices] of devicesByZone.entries()) {
            const device = devices[0]; // Use first device for zone info
            const sensorData = device.sensorData;
            
            // Determine status based on moisture
            const moisture = sensorData?.moisture || 0;
            let status = 'completed';
            let statusText = 'Healthy';
            if (moisture < 30) {
                status = 'critical';
                statusText = 'Critical';
            } else if (moisture < 50) {
                status = 'pending';
                statusText = 'Warning';
            }

            // Format last update
            const lastUpdate = sensorData?.timestamp 
                ? this.formatTimestamp(sensorData.timestamp)
                : 'No data';

            // Extract zone letter for field ID
            const zoneLetter = zoneName.replace('Zone ', '').trim();
            const fieldId = `Field ${zoneLetter}-${device.deviceId.slice(-4)}`; // Use last 4 chars of device ID

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${fieldId}</td>
                <td>${devices.length} device${devices.length > 1 ? 's' : ''}</td>
                <td><span class="status-badge ${status}">${statusText}</span></td>
                <td>${lastUpdate}</td>
            `;
            tableBody.appendChild(row);
        }
    }
    
    getZoneStatusData() {
        const selectedZone = localStorage.getItem('selectedZone') || 'A';
        
        const statusData = {
            'A': [
                {
                    type: 'watering',
                    title: 'Watering Status',
                    status: 'healthy',
                    content: 'Optimal moisture levels maintained. Next scheduled watering in 4 hours.',
                    time: '2 hours ago'
                },
                {
                    type: 'fertilizer',
                    title: 'Fertilizer Status',
                    status: 'warning',
                    content: 'Nitrogen levels below optimal. Consider applying NPK fertilizer.',
                    time: '3 days ago'
                },
                {
                    type: 'disease',
                    title: 'Plant Health',
                    status: 'healthy',
                    content: 'All plants showing healthy growth. No signs of disease detected.',
                    time: '1 day ago'
                }
            ],
            'B': [
                {
                    type: 'watering',
                    title: 'Watering Status',
                    status: 'healthy',
                    content: 'Moisture levels optimal. Irrigation system functioning normally.',
                    time: '1 hour ago'
                },
                {
                    type: 'fertilizer',
                    title: 'Fertilizer Status',
                    status: 'healthy',
                    content: 'Nutrient levels balanced. Last application successful.',
                    time: '1 week ago'
                },
                {
                    type: 'disease',
                    title: 'Plant Health',
                    status: 'warning',
                    content: 'Minor leaf discoloration detected. Monitoring required.',
                    time: '2 days ago'
                }
            ],
            'C': [
                {
                    type: 'watering',
                    title: 'Watering Status',
                    status: 'critical',
                    content: 'Low moisture levels detected. Immediate irrigation required.',
                    time: '30 minutes ago'
                },
                {
                    type: 'fertilizer',
                    title: 'Fertilizer Status',
                    status: 'healthy',
                    content: 'Nutrient levels adequate for current growth stage.',
                    time: '5 days ago'
                },
                {
                    type: 'disease',
                    title: 'Plant Health',
                    status: 'critical',
                    content: 'Fungal infection detected. Treatment required immediately.',
                    time: '6 hours ago'
                }
            ],
            'D': [
                {
                    type: 'watering',
                    title: 'Watering Status',
                    status: 'healthy',
                    content: 'Excellent moisture distribution. System operating efficiently.',
                    time: '3 hours ago'
                },
                {
                    type: 'fertilizer',
                    title: 'Fertilizer Status',
                    status: 'healthy',
                    content: 'All nutrients at optimal levels. Growth rate excellent.',
                    time: '2 days ago'
                },
                {
                    type: 'disease',
                    title: 'Plant Health',
                    status: 'healthy',
                    content: 'Vigorous growth with no disease symptoms observed.',
                    time: '1 day ago'
                }
            ]
        };
        
        return statusData[selectedZone] || statusData['A'];
    }
    
    createStatusCard(status) {
        const card = document.createElement('div');
        card.className = `status-card ${status.status}`;
        card.setAttribute('data-type', status.type);
        
        card.innerHTML = `
            <div class="status-card-header">
                <h4 class="status-card-title">${status.title}</h4>
                <span class="status-badge ${status.status}">${status.status}</span>
            </div>
            <div class="status-card-content">
                <p>${status.content}</p>
                <small style="color: #94a3b8;">${status.time}</small>
            </div>
        `;
        
        return card;
    }
    
    filterStatusCards(filter) {
        const cards = document.querySelectorAll('.status-card');
        
        cards.forEach(card => {
            if (filter === 'all' || card.getAttribute('data-type') === filter) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    toggleRecording(btn) {
        if (btn.classList.contains('recording')) {
            btn.classList.remove('recording');
            btn.innerHTML = '<i class="fas fa-video"></i> Record';
            btn.style.background = '#f1f5f9';
            btn.style.color = '#64748b';
        } else {
            btn.classList.add('recording');
            btn.innerHTML = '<i class="fas fa-stop"></i> Stop Recording';
            btn.style.background = '#ef4444';
            btn.style.color = 'white';
        }
    }
}

// Initialize based on current page
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname;
    
    console.log('Current page:', currentPage);
    
    if (currentPage.includes('dashboard.html') || currentPage.includes('dashboard') || currentPage.includes('index.html')) {
        console.log('Initializing ZoneNavigationManager');
        new ZoneNavigationManager();
    } else if (currentPage.includes('Map.html') || currentPage.includes('map.html') || currentPage.includes('Map') || currentPage.includes('map')) {
        console.log('Initializing CameraFeedManager');
        new CameraFeedManager();
    }
});
