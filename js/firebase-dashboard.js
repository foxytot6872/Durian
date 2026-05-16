// Firebase Dashboard Integration
// Reads sensor data from Firebase Realtime Database per FIREBASE_RTDB_ARCHITECTURE.md
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { auth } from './firebase-config.js';
import { virtualSensorData } from './virtual-sensor-data.js';

// Database URL (from Firebase config)
const DB_URL = "https://testing-151e6-default-rtdb.asia-southeast1.firebasedatabase.app";

class FirebaseDashboardManager {
    constructor() {
        this.currentUser = null;
        this.idToken = null;
        this.devices = new Map(); // deviceId -> device data
        this.sensorListeners = new Map(); // deviceId -> listener cleanup function
        this.updateCallbacks = []; // Callbacks to notify when data updates
        this.init();
    }

    async init() {
        console.log('🔥 Initializing Firebase Dashboard Manager...');

        // Wait for authentication
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = user;
                try {
                    this.idToken = await user.getIdToken();
                    console.log('✅ User authenticated:', user.uid);
                    await this.loadUserDevices();
                } catch (error) {
                    console.error('❌ Error getting ID token:', error);
                }
            } else {
                console.log('⚠️ User not authenticated');
                this.cleanup();
            }
        });
    }

    /**
     * Load all devices for the current user
     * Path: /users/<uid>/devices/
     */
    async loadUserDevices() {
        if (!this.currentUser || !this.idToken) {
            console.error('❌ Not authenticated');
            return;
        }

        try {
            const url = `${DB_URL}/users/${this.currentUser.uid}/devices.json?auth=${this.idToken}`;
            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 404) {
                    console.log('📭 No devices found for user');
                    this.startVirtualSensorFeed();
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const devicesData = await response.json();

            if (!devicesData) {
                console.log('📭 No devices found');
                this.startVirtualSensorFeed();
                return;
            }

            console.log('📱 Found devices:', Object.keys(devicesData));

            // Setup real-time listeners for each device
            for (const [deviceId, deviceInfo] of Object.entries(devicesData)) {
                if (deviceInfo && deviceInfo.device_info) {
                    await this.setupDeviceListener(deviceId, deviceInfo.device_info);
                }
            }

            // Trigger dashboard update
            this.updateDashboard();
            this.startVirtualSensorFeed();
        } catch (error) {
            console.error('❌ Error loading user devices:', error);
            this.startVirtualSensorFeed();
        }
    }

    /**
     * Setup real-time listener for a device's sensor data
     * Path: /users/<uid>/devices/<deviceId>/sensor_data/
     */
    async setupDeviceListener(deviceId, deviceInfo) {
        if (!this.currentUser || !this.idToken) {
            return;
        }

        // Store device info
        const deviceType = deviceInfo.type || (deviceId.startsWith('pi_') ? 'camera_server' : 'sensor');
        this.devices.set(deviceId, {
            deviceId,
            name: deviceInfo.name || deviceId,
            zone: deviceInfo.zone || 'Unknown',
            type: deviceType,
            firmware_version: deviceInfo.firmware_version || '1.0.0',
            last_online: deviceInfo.last_online || 0,
            ip_address: deviceInfo.ip_address || '',
            sensorData: null,
            cameraFeeds: null // For Pi devices
        });

        // Load camera feeds for Pi devices
        if (deviceType === 'camera_server') {
            this.loadCameraFeeds(deviceId);
        }

        // Setup real-time listener for sensor data (ESP32 devices only)
        if (deviceType === 'sensor') {
            await this.fetchSensorData(deviceId);
            const pollInterval = setInterval(async () => {
                await this.fetchSensorData(deviceId);
            }, 5 * 60 * 1000);
            this.sensorListeners.set(deviceId, () => clearInterval(pollInterval));
        }

        // Setup real-time listener for camera feeds (Pi devices only)
        if (deviceType === 'camera_server') {
            this.sensorListeners.set(deviceId, () => {});
        }

        console.log(`✅ Listener setup for device: ${deviceId} (${deviceInfo.name}) - Type: ${deviceType}`);
    }

    async fetchSensorData(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device || !this.currentUser || !this.idToken) return;

        try {
            const url = `${DB_URL}/users/${this.currentUser.uid}/devices/${deviceId}/sensor_data.json?auth=${this.idToken}`;
            const response = await fetch(url);

            if (response.ok) {
                const sensorData = await response.json();
                if (sensorData) {
                    this.updateDeviceSensorData(deviceId, sensorData);
                } else if (!device.sensorData) {
                    this.updateDeviceSensorData(deviceId, this.getVirtualReadingForZone(device.zone));
                }
            } else if (response.status === 404) {
                console.log(`📭 No sensor data for device ${deviceId}`);
                if (!device.sensorData) {
                    this.updateDeviceSensorData(deviceId, this.getVirtualReadingForZone(device.zone));
                }
            }
        } catch (error) {
            console.error(`❌ Error fetching sensor data for ${deviceId}:`, error);
            if (!device.sensorData) {
                this.updateDeviceSensorData(deviceId, this.getVirtualReadingForZone(device.zone));
            }
        }
    }

    /**
     * Load camera feeds for a Pi device
     * Path: /users/<uid>/devices/<deviceId>/camera_feeds/
     */
    async loadCameraFeeds(deviceId) {
        if (!this.currentUser || !this.idToken) {
            return;
        }

        try {
            const url = `${DB_URL}/users/${this.currentUser.uid}/devices/${deviceId}/camera_feeds.json?auth=${this.idToken}`;
            const response = await fetch(url);

            if (response.ok) {
                const cameraFeeds = await response.json();
                const device = this.devices.get(deviceId);
                if (device) {
                    device.cameraFeeds = cameraFeeds || {};
                    // Notify callbacks about camera feed updates
                    this.notifyCallbacks();
                }
            } else if (response.status === 404) {
                // No camera feeds yet
                const device = this.devices.get(deviceId);
                if (device) {
                    device.cameraFeeds = {};
                }
            }
        } catch (error) {
            console.error(`❌ Error fetching camera feeds for ${deviceId}:`, error);
        }
    }

    /**
     * Update device sensor data and trigger dashboard update
     */
    updateDeviceSensorData(deviceId, sensorData) {
        const device = this.devices.get(deviceId);
        if (device) {
            device.sensorData = sensorData;
            device.lastUpdate = Date.now();
            console.log(`📊 Updated sensor data for ${device.name}:`, sensorData);
            this.updateDashboard();
            // Notify all callbacks
            this.notifyCallbacks();
        }
    }

    /**
     * Feed virtual sensor values when real sensors are unavailable.
     * The generated values include 14 days of hourly Rangsit-inspired history.
     */
    startVirtualSensorFeed() {
        this.applyVirtualSensorReadings();
    }

    applyVirtualSensorReadings() {
        const virtualDevices = virtualSensorData.getCurrentReadings();
        const sensorDevices = Array.from(this.devices.values()).filter(device => device.type === 'sensor');

        if (sensorDevices.length === 0) {
            virtualDevices.forEach(device => {
                this.devices.set(device.deviceId, device);
            });
        } else {
            sensorDevices.forEach((device, index) => {
                const virtualDevice = virtualDevices.find(item => item.zone === device.zone) || virtualDevices[index % virtualDevices.length];
                if (!device.sensorData || device.sensorData.source === 'virtual') {
                    device.sensorData = {
                        ...virtualDevice.sensorData,
                        source: 'virtual'
                    };
                    device.lastUpdate = Date.now();
                }
            });
        }

        this.updateDashboard();
        this.notifyCallbacks();
    }

    getVirtualReadingForZone(zone) {
        const virtualDevices = virtualSensorData.getCurrentReadings();
        const reading = virtualDevices.find(device => device.zone === zone) || virtualDevices[0];
        return reading.sensorData;
    }

    /**
     * Register a callback to be notified when sensor data updates
     */
    onUpdate(callback) {
        this.updateCallbacks.push(callback);
    }

    /**
     * Notify all registered callbacks
     */
    notifyCallbacks() {
        this.updateCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error in update callback:', error);
            }
        });
    }

    /**
     * Update dashboard with current sensor data
     */
    updateDashboard() {
        // Group devices by zone (include all devices, even without sensor data)
        const devicesByZone = new Map();

        for (const [deviceId, device] of this.devices.entries()) {
            const zone = device.zone;
            if (!zone) continue; // Skip devices without zone assignment

            if (!devicesByZone.has(zone)) {
                devicesByZone.set(zone, []);
            }
            devicesByZone.get(zone).push(device);
        }

        // Update stat cards (aggregate across all devices with sensor data)
        this.updateStatCards();
        this.updateFarmStatusOverview();

        // Update zone cards (show all zones with devices)
        this.updateZoneCards(devicesByZone);
    }

    updateFarmStatusOverview() {
        const summary = virtualSensorData.getFarmStatus();
        const statusText = document.getElementById('farmStatusText');
        const statusDetail = document.getElementById('farmStatusDetail');
        const statusDot = document.getElementById('farmStatusDot');
        const indicator = document.getElementById('farmStatusIndicator');

        if (!statusText && !statusDetail && !statusDot) return;

        const normalized = summary.status === 'healthy' ? 'healthy' : summary.status === 'risky' ? 'warning' : 'critical';
        if (statusText) {
            statusText.textContent = `${summary.text} - Score ${summary.score}`;
        }
        if (statusDetail) {
            statusDetail.textContent = summary.description;
        }
        if (statusDot) {
            statusDot.className = `status-dot ${normalized}`;
        }
        if (indicator) {
            indicator.style.color = normalized === 'healthy' ? '#059669' : normalized === 'warning' ? '#92400e' : '#dc2626';
        }
    }

    /**
     * Update stat cards with aggregated sensor data
     */
    updateStatCards() {
        let totalMoisture = 0;
        let totalTemp = 0;
        let deviceCount = 0;

        for (const device of this.devices.values()) {
            if (device.sensorData) {
                if (device.sensorData.moisture !== undefined) {
                    totalMoisture += device.sensorData.moisture;
                }
                if (device.sensorData.temperature !== undefined) {
                    totalTemp += device.sensorData.temperature;
                }
                deviceCount++;
            }
        }

        if (deviceCount > 0) {
            const avgMoisture = Math.round(totalMoisture / deviceCount);
            const avgTemp = Math.round(totalTemp / deviceCount);

            // Update soil moisture card (find by icon class)
            const statCards = document.querySelectorAll('.stat-card');
            statCards.forEach(card => {
                const icon = card.querySelector('.stat-icon i');
                if (icon && icon.classList.contains('fa-tint')) {
                    const valueElement = card.querySelector('h3');
                    const changeElement = card.querySelector('.stat-change');
                    if (valueElement) valueElement.textContent = `${avgMoisture}%`;
                    if (changeElement) {
                        changeElement.textContent = avgMoisture >= 50 ? 'Optimal' : 'Low';
                        changeElement.className = `stat-change ${avgMoisture >= 50 ? 'positive' : 'negative'}`;
                    }
                }

                // Update temperature card
                if (icon && icon.classList.contains('fa-thermometer-half')) {
                    const valueElement = card.querySelector('h3');
                    if (valueElement) valueElement.textContent = `${avgTemp}°C`;
                }
            });
        }
    }

    /**
     * Update zone cards with sensor data
     * Dynamically creates zone cards based on Firebase data
     */
    updateZoneCards(devicesByZone) {
        const zonesGrid = document.getElementById('zonesGrid');
        if (!zonesGrid) {
            console.log('⚠️ Zones grid container not found');
            return;
        }

        // Clear existing zone cards
        zonesGrid.innerHTML = '';

        if (devicesByZone.size === 0) {
            zonesGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #718096;">No zones with devices found. Claim a device to get started.</p>';
            return;
        }

        // Sort zones by zone letter
        const sortedZones = Array.from(devicesByZone.entries()).sort((a, b) => {
            const zoneA = a[0].replace('Zone ', '').trim();
            const zoneB = b[0].replace('Zone ', '').trim();
            return zoneA.localeCompare(zoneB);
        });

        // Create zone cards dynamically
        for (const [zone, devices] of sortedZones) {
            // Get the first device's data for the zone (or average if multiple)
            const device = devices[0];
            const sensorData = device?.sensorData;

            // Extract zone letter (e.g., "Zone A" -> "A")
            const zoneLetter = zone.replace('Zone ', '').trim();
            const zoneName = device?.name || `${zone} Sensor`;

            // Determine status based on moisture
            const moisture = sensorData?.moisture || 0;
            let status = sensorData?.status === 'extreme' ? 'critical' : sensorData?.status || 'healthy';
            let statusText = sensorData?.status ? sensorData.status.charAt(0).toUpperCase() + sensorData.status.slice(1) : 'Healthy';
            if (status === 'risky') status = 'warning';
            if (status === 'danger') status = 'critical';
            if (!sensorData?.status && moisture < 30) {
                status = 'critical';
                statusText = 'Critical';
            } else if (!sensorData?.status && moisture < 50) {
                status = 'warning';
                statusText = 'Warning';
            }

            // Create zone card element
            const zoneCard = document.createElement('div');
            zoneCard.className = `zone-card ${status} clickable-zone`;
            zoneCard.setAttribute('data-zone', zoneLetter);
            zoneCard.setAttribute('data-zone-name', zoneName);

            // Build metrics HTML
            const moistureValue = sensorData ? Math.round(sensorData.moisture || 0) : 0;
            const tempValue = sensorData ? Math.round(sensorData.temperature || 0) : 0;

            zoneCard.innerHTML = `
                <div class="zone-header">
                    <h4>${zone} - ${zoneName}</h4>
                    <span class="zone-status">${statusText}</span>
                    <i class="fas fa-camera zone-camera-icon"></i>
                </div>
                <div class="zone-metrics">
                    <div class="metric">
                        <span class="metric-label">Soil Moisture</span>
                        <span class="metric-value">${moistureValue}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Temperature</span>
                        <span class="metric-value">${tempValue}°C</span>
                    </div>
                </div>
                <div class="zone-footer">
                    <span class="view-camera-text">Click to view live camera</span>
                </div>
            `;

            // Add click handler for navigation
            zoneCard.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.setItem('selectedZone', zoneLetter);
                localStorage.setItem('selectedZoneName', zoneName);
                window.location.href = 'Map.html';
            });

            zonesGrid.appendChild(zoneCard);
        }

        console.log(`✅ Created ${sortedZones.length} zone cards dynamically`);
    }

    /**
     * Get all devices data
     */
    getDevices() {
        return Array.from(this.devices.values());
    }

    /**
     * Get devices by zone
     */
    getDevicesByZone(zone) {
        return Array.from(this.devices.values()).filter(device => device.zone === zone);
    }

    /**
     * Get all camera devices (Pi devices)
     */
    getCameraDevices() {
        return Array.from(this.devices.values()).filter(device => device.type === 'camera_server');
    }

    /**
     * Get camera feeds for a specific device
     */
    getCameraFeeds(deviceId) {
        const device = this.devices.get(deviceId);
        return device && device.type === 'camera_server' ? device.cameraFeeds : null;
    }

    /**
     * Remove device from user (hard delete)
     * Removes from both device_registry and user's devices
     * Device will become orphan and unclaimed
     */
    async removeDevice(deviceId) {
        if (!this.currentUser || !this.idToken) {
            throw new Error('Authentication required');
        }

        try {
            // Cleanup listeners for this device
            const cleanup = this.sensorListeners.get(deviceId);
            if (cleanup) {
                cleanup();
                this.sensorListeners.delete(deviceId);
            }

            // Remove from device_registry
            const registryUrl = `${DB_URL}/device_registry/${deviceId}.json?auth=${this.idToken}`;
            const registryResponse = await fetch(registryUrl, {
                method: 'DELETE'
            });

            if (registryResponse.status === 401 || registryResponse.status === 403) {
                // Token expired, refresh and retry
                this.idToken = await this.currentUser.getIdToken(true);
                const retryRegistryResponse = await fetch(`${DB_URL}/device_registry/${deviceId}.json?auth=${this.idToken}`, {
                    method: 'DELETE'
                });
                if (!retryRegistryResponse.ok && retryRegistryResponse.status !== 404) {
                    throw new Error(`Failed to remove device from registry: HTTP ${retryRegistryResponse.status}`);
                }
            } else if (!registryResponse.ok && registryResponse.status !== 404) {
                throw new Error(`Failed to remove device from registry: HTTP ${registryResponse.status}`);
            }

            // Remove from user's devices
            const userDeviceUrl = `${DB_URL}/users/${this.currentUser.uid}/devices/${deviceId}.json?auth=${this.idToken}`;
            const userDeviceResponse = await fetch(userDeviceUrl, {
                method: 'DELETE'
            });

            if (userDeviceResponse.status === 401 || userDeviceResponse.status === 403) {
                // Token expired, refresh and retry
                this.idToken = await this.currentUser.getIdToken(true);
                const retryUserDeviceResponse = await fetch(`${DB_URL}/users/${this.currentUser.uid}/devices/${deviceId}.json?auth=${this.idToken}`, {
                    method: 'DELETE'
                });
                if (!retryUserDeviceResponse.ok && retryUserDeviceResponse.status !== 404) {
                    throw new Error(`Failed to remove device from user: HTTP ${retryUserDeviceResponse.status}`);
                }
            } else if (!userDeviceResponse.ok && userDeviceResponse.status !== 404) {
                throw new Error(`Failed to remove device from user: HTTP ${userDeviceResponse.status}`);
            }

            // Remove from local devices map
            this.devices.delete(deviceId);

            // Update dashboard
            this.updateDashboard();

            // Notify callbacks
            this.notifyCallbacks();

            console.log(`✅ Device ${deviceId} removed successfully`);
            return true;
        } catch (error) {
            console.error('❌ Error removing device:', error);
            throw error;
        }
    }

    /**
     * Cleanup listeners
     */
    cleanup() {
        for (const cleanup of this.sensorListeners.values()) {
            cleanup();
        }
        this.sensorListeners.clear();
        this.devices.clear();
    }
}

// Initialize when DOM is ready
let dashboardManager = null;

document.addEventListener('DOMContentLoaded', () => {
    dashboardManager = new FirebaseDashboardManager();
    window.firebaseDashboard = dashboardManager;
});

export { FirebaseDashboardManager };
