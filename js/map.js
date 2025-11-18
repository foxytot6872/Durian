// Map Page JavaScript - Handles farm map functionality
// Uses real-time Firebase data from Firebase Dashboard Manager
class MapDashboard {
    constructor() {
        this.map = null;
        this.markers = [];
        this.zones = [];
        this.firebaseDashboard = null;
        this.init();
    }

    init() {
        // Wait for Firebase Dashboard Manager
        this.waitForFirebase();
        this.initializeMap();
        this.setupEventListeners();
    }

    waitForFirebase() {
        // Check if Firebase Dashboard Manager is available
        if (window.firebaseDashboard) {
            this.firebaseDashboard = window.firebaseDashboard;
            this.loadMapDataFromFirebase();
            this.setupFirebaseListener();
        } else {
            // Retry after a delay
            setTimeout(() => this.waitForFirebase(), 500);
        }
    }

    setupFirebaseListener() {
        if (this.firebaseDashboard) {
            // Register callback to be notified when data updates
            this.firebaseDashboard.onUpdate(() => {
                this.loadMapDataFromFirebase();
            });
            
            // Also set up polling as backup (updates every 5 seconds)
            setInterval(() => {
                this.loadMapDataFromFirebase();
            }, 5000);
        }
    }

    /**
     * Load real zone data from Firebase
     * Groups devices by zone and aggregates sensor data
     */
    loadMapDataFromFirebase() {
        if (!this.firebaseDashboard) {
            console.log('⚠️ Firebase Dashboard Manager not available');
            return;
        }

        const allDevices = this.firebaseDashboard.getDevices();
        
        if (allDevices.length === 0) {
            console.log('📭 No devices found');
            // Initialize with empty zones
            this.initializeEmptyZones();
            this.updateMapDisplay();
            return;
        }

        // Group devices by zone
        const devicesByZone = new Map();
        
        for (const device of allDevices) {
            const zone = device.zone || 'Unknown';
            if (!devicesByZone.has(zone)) {
                devicesByZone.set(zone, []);
            }
            devicesByZone.get(zone).push(device);
        }

        // Convert to zones array with real data
        this.zones = [];
        
        // Process each zone
        for (const [zoneName, devices] of devicesByZone.entries()) {
            // Extract zone letter (e.g., "Zone A" -> "A")
            const zoneLetter = zoneName.replace('Zone ', '').trim().toUpperCase();
            
            // Aggregate sensor data from all devices in this zone
            const aggregatedData = this.aggregateZoneData(devices);
            
            // Determine status based on moisture
            let status = 'healthy';
            if (aggregatedData.moisture < 30) {
                status = 'critical';
            } else if (aggregatedData.moisture < 50) {
                status = 'warning';
            }

            // Get zone name from device or use default
            const deviceName = devices[0]?.name || `${zoneName} Sensor`;
            
            this.zones.push({
                id: `zone-${zoneLetter.toLowerCase()}`,
                name: `${zoneName} - ${deviceName}`,
                zoneLetter: zoneLetter,
                coordinates: this.getZoneCoordinates(zoneLetter),
                status: status,
                deviceCount: devices.length,
                metrics: {
                    soilMoisture: aggregatedData.moisture,
                    temperature: aggregatedData.temperature,
                    ec: aggregatedData.ec,
                    ph: aggregatedData.ph,
                    n: aggregatedData.n,
                    p: aggregatedData.p,
                    k: aggregatedData.k,
                    lastUpdate: aggregatedData.lastUpdate
                },
                devices: devices // Store device references
            });
        }

        // Sort zones by zone letter
        this.zones.sort((a, b) => a.zoneLetter.localeCompare(b.zoneLetter));

        console.log('📊 Loaded zones from Firebase:', this.zones.length);
        this.updateMapDisplay();
    }

    /**
     * Aggregate sensor data from multiple devices in a zone
     */
    aggregateZoneData(devices) {
        let totalMoisture = 0;
        let totalTemp = 0;
        let totalEc = 0;
        let totalPh = 0;
        let totalN = 0;
        let totalP = 0;
        let totalK = 0;
        let deviceCount = 0;
        let latestTimestamp = 0;

        for (const device of devices) {
            if (device.sensorData) {
                if (device.sensorData.moisture !== undefined) {
                    totalMoisture += device.sensorData.moisture;
                }
                if (device.sensorData.temperature !== undefined) {
                    totalTemp += device.sensorData.temperature;
                }
                if (device.sensorData.ec !== undefined) {
                    totalEc += device.sensorData.ec;
                }
                if (device.sensorData.ph !== undefined) {
                    totalPh += device.sensorData.ph;
                }
                if (device.sensorData.n !== undefined) {
                    totalN += device.sensorData.n;
                }
                if (device.sensorData.p !== undefined) {
                    totalP += device.sensorData.p;
                }
                if (device.sensorData.k !== undefined) {
                    totalK += device.sensorData.k;
                }
                if (device.sensorData.timestamp) {
                    latestTimestamp = Math.max(latestTimestamp, device.sensorData.timestamp);
                }
                deviceCount++;
            }
        }

        return {
            moisture: deviceCount > 0 ? Math.round(totalMoisture / deviceCount) : 0,
            temperature: deviceCount > 0 ? Math.round(totalTemp / deviceCount) : 0,
            ec: deviceCount > 0 ? Math.round(totalEc / deviceCount) : 0,
            ph: deviceCount > 0 ? (totalPh / deviceCount).toFixed(1) : 0,
            n: deviceCount > 0 ? Math.round(totalN / deviceCount) : 0,
            p: deviceCount > 0 ? Math.round(totalP / deviceCount) : 0,
            k: deviceCount > 0 ? Math.round(totalK / deviceCount) : 0,
            lastUpdate: latestTimestamp
        };
    }

    /**
     * Get coordinates for a zone (default coordinates, can be customized)
     */
    getZoneCoordinates(zoneLetter) {
        // Default coordinates for Thailand (can be customized per zone)
        const baseLat = 13.7563;
        const baseLng = 100.5018;
        
        const offsets = {
            'A': { lat: 0, lng: 0 },
            'B': { lat: -0.002, lng: 0 },
            'C': { lat: 0, lng: 0.002 },
            'D': { lat: 0, lng: -0.002 }
        };

        const offset = offsets[zoneLetter] || { lat: 0, lng: 0 };
        return {
            lat: baseLat + offset.lat,
            lng: baseLng + offset.lng
        };
    }

    /**
     * Initialize empty zones if no devices found
     */
    initializeEmptyZones() {
        const zoneLetters = ['A', 'B', 'C', 'D'];
        this.zones = zoneLetters.map(letter => ({
            id: `zone-${letter.toLowerCase()}`,
            name: `Zone ${letter}`,
            zoneLetter: letter,
            coordinates: this.getZoneCoordinates(letter),
            status: 'unknown',
            deviceCount: 0,
            metrics: {
                soilMoisture: 0,
                temperature: 0,
                ec: 0,
                ph: 0,
                n: 0,
                p: 0,
                k: 0,
                lastUpdate: 0
            }
        }));
    }

    initializeMap() {
        // Initialize map if container exists
        const mapContainer = document.getElementById('farmMap');
        if (!mapContainer) return;

        // Simple map implementation (you can replace with actual map library)
        this.createMapVisualization();
    }

    createMapVisualization() {
        const mapContainer = document.getElementById('farmMap');
        if (!mapContainer) return;

        // Create a simple grid-based map visualization with real data
        mapContainer.innerHTML = `
            <div class="map-grid">
                ${this.zones.map(zone => `
                    <div class="map-zone ${zone.status}" data-zone-id="${zone.id}" data-zone-letter="${zone.zoneLetter}">
                        <div class="zone-label">${zone.name}</div>
                        ${zone.deviceCount > 0 ? `
                            <div class="zone-device-count">
                                <i class="fas fa-microchip"></i>
                                ${zone.deviceCount} device${zone.deviceCount > 1 ? 's' : ''}
                            </div>
                        ` : `
                            <div class="zone-device-count no-devices">
                                <i class="fas fa-exclamation-circle"></i>
                                No devices
                            </div>
                        `}
                        <div class="zone-metrics">
                            <div class="metric">
                                <span class="metric-label">Moisture</span>
                                <span class="metric-value">${zone.metrics.soilMoisture}%</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Temp</span>
                                <span class="metric-value">${zone.metrics.temperature}°C</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">pH</span>
                                <span class="metric-value">${zone.metrics.ph}</span>
                            </div>
                            ${zone.deviceCount > 0 ? `
                                <div class="metric">
                                    <span class="metric-label">EC</span>
                                    <span class="metric-value">${zone.metrics.ec} µS/cm</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    updateMapDisplay() {
        // Recreate map visualization with updated data
        this.createMapVisualization();
        this.updateZoneStatuses();
        this.updateMapLegend();
        
        // Update zone details if a zone is selected
        const selectedZone = this.zones.find(z => 
            document.querySelector(`[data-zone-id="${z.id}"]`)?.classList.contains('selected')
        ) || this.zones[0];
        
        if (selectedZone) {
            this.updateZoneDetails(selectedZone);
        }
    }

    updateZoneStatuses() {
        this.zones.forEach(zone => {
            const zoneElement = document.querySelector(`[data-zone-id="${zone.id}"]`);
            if (zoneElement) {
                zoneElement.className = `map-zone ${zone.status}`;
            }
        });
    }

    updateMapLegend() {
        const legendContainer = document.querySelector('.map-legend');
        if (!legendContainer) return;

        legendContainer.innerHTML = `
            <div class="legend-item">
                <span class="legend-color healthy"></span>
                <span>Healthy (${this.zones.filter(z => z.status === 'healthy').length})</span>
            </div>
            <div class="legend-item">
                <span class="legend-color warning"></span>
                <span>Warning (${this.zones.filter(z => z.status === 'warning').length})</span>
            </div>
            <div class="legend-item">
                <span class="legend-color critical"></span>
                <span>Critical (${this.zones.filter(z => z.status === 'critical').length})</span>
            </div>
        `;
    }

    updateZoneDetails() {
        const detailsContainer = document.querySelector('.zone-details');
        if (!detailsContainer) return;

        const selectedZone = this.zones[0]; // Default to first zone
        detailsContainer.innerHTML = `
            <h3>${selectedZone.name}</h3>
            <div class="zone-stats">
                <div class="stat-item">
                    <span class="stat-label">Status</span>
                    <span class="stat-value status-${selectedZone.status}">${selectedZone.status.toUpperCase()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Soil Moisture</span>
                    <span class="stat-value">${selectedZone.metrics.soilMoisture}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Temperature</span>
                    <span class="stat-value">${selectedZone.metrics.temperature}°C</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Plant Count</span>
                    <span class="stat-value">${selectedZone.metrics.plantCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Health Score</span>
                    <span class="stat-value">${selectedZone.metrics.health}%</span>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Zone selection
        document.addEventListener('click', (e) => {
            const zoneElement = e.target.closest('.map-zone');
            if (zoneElement) {
                const zoneId = zoneElement.dataset.zoneId;
                this.selectZone(zoneId);
            }
        });

        // Map controls
        const zoomInBtn = document.querySelector('.zoom-in');
        const zoomOutBtn = document.querySelector('.zoom-out');
        const resetBtn = document.querySelector('.reset-map');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.zoomIn());
        }
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetMap());
        }

        // Layer toggles
        const layerToggles = document.querySelectorAll('.layer-toggle');
        layerToggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                this.toggleLayer(e.target.value, e.target.checked);
            });
        });
    }

    selectZone(zoneId) {
        const zone = this.zones.find(z => z.id === zoneId);
        if (!zone) return;

        // Update selected zone
        document.querySelectorAll('.map-zone').forEach(el => {
            el.classList.remove('selected');
        });
        const zoneElement = document.querySelector(`[data-zone-id="${zoneId}"]`);
        if (zoneElement) {
            zoneElement.classList.add('selected');
        }

        // Store selected zone in localStorage for Map page navigation
        if (zone.zoneLetter) {
            localStorage.setItem('selectedZone', zone.zoneLetter);
            localStorage.setItem('selectedZoneName', zone.name);
        }

        // Update zone details
        this.updateZoneDetails(zone);
    }

    updateZoneDetails(zone) {
        const detailsContainer = document.querySelector('.zone-details');
        if (!detailsContainer) return;

        // Format last update time
        const lastUpdate = zone.metrics.lastUpdate 
            ? this.formatTimestamp(zone.metrics.lastUpdate)
            : 'No data';

        detailsContainer.innerHTML = `
            <h3>${zone.name}</h3>
            <div class="zone-stats">
                <div class="stat-item">
                    <span class="stat-label">Status</span>
                    <span class="stat-value status-${zone.status}">${zone.status.toUpperCase()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Devices</span>
                    <span class="stat-value">${zone.deviceCount || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Soil Moisture</span>
                    <span class="stat-value">${zone.metrics.soilMoisture}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Temperature</span>
                    <span class="stat-value">${zone.metrics.temperature}°C</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Electrical Conductivity</span>
                    <span class="stat-value">${zone.metrics.ec} µS/cm</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">pH Level</span>
                    <span class="stat-value">${zone.metrics.ph}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Nitrogen (N)</span>
                    <span class="stat-value">${zone.metrics.n} mg/kg</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Phosphorus (P)</span>
                    <span class="stat-value">${zone.metrics.p} mg/kg</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Potassium (K)</span>
                    <span class="stat-value">${zone.metrics.k} mg/kg</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Last Update</span>
                    <span class="stat-value">${lastUpdate}</span>
                </div>
            </div>
        `;
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return 'Never';
        
        const now = Date.now();
        const diff = now - timestamp;
        
        // If timestamp seems to be from ESP32 (millis since boot), show relative time
        if (diff > 86400000) { // More than 24 hours difference
            return 'Just now';
        }
        
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

    zoomIn() {
        console.log('Zooming in...');
        // Implement zoom in functionality
    }

    zoomOut() {
        console.log('Zooming out...');
        // Implement zoom out functionality
    }

    resetMap() {
        console.log('Resetting map...');
        // Implement map reset functionality
    }

    toggleLayer(layerName, visible) {
        console.log(`Toggling layer ${layerName}: ${visible}`);
        // Implement layer toggle functionality
    }
}

// Initialize map dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MapDashboard();
});
