/**
 * Valve Control Module
 * 
 * Controls ESP32 valve devices via Firebase Realtime Database
 * Path: /users/{userId}/devices/{deviceId}/valve_control/valveStatus
 * 
 * Expected values: "ON" or "OFF" (uppercase)
 * 
 * Database Structure (matches existing device pattern):
 * /users/{userId}/devices/{deviceId}/
 *   - device_info/
 *   - valve_control/
 *     - valveStatus: "ON" or "OFF"
 */

// Database URL (from Firebase config)
const DB_URL = "https://testing-151e6-default-rtdb.asia-southeast1.firebasedatabase.app";

class ValveControlManager {
    constructor() {
        this.currentUser = null;
        this.idToken = null;
        this.valveListeners = new Map(); // deviceId -> listener cleanup function
        this.valveStates = new Map(); // deviceId -> current state ("ON" or "OFF")
        this.init();
    }

    async init() {
        console.log('💧 Initializing Valve Control Manager...');
        
        // Wait for authentication
        if (window.firebaseAuth) {
            window.firebaseAuth.onAuthStateChanged(async (user) => {
                if (user) {
                    this.currentUser = user;
                    try {
                        this.idToken = await user.getIdToken();
                        console.log('✅ User authenticated for valve control:', user.uid);
                        await this.setupValveControls();
                    } catch (error) {
                        console.error('❌ Error getting ID token:', error);
                    }
                } else {
                    console.log('⚠️ User not authenticated');
                    this.cleanup();
                }
            });
        } else {
            // Fallback: wait for Firebase Auth
            setTimeout(() => this.init(), 1000);
        }
    }

    /**
     * Setup valve controls for all devices
     * Gets devices from Firebase Dashboard Manager if available
     */
    async setupValveControls() {
        if (!this.currentUser || !this.idToken) {
            console.error('❌ Not authenticated');
            return;
        }

        // Get devices from Firebase Dashboard Manager if available
        let devices = [];
        if (window.firebaseDashboard) {
            devices = window.firebaseDashboard.getDevices();
        } else {
            // Fallback: load devices directly
            devices = await this.loadUserDevices();
        }

        console.log(`📱 Found ${devices.length} devices for valve control`);

        // Setup valve control for each device
        for (const device of devices) {
            // Only setup for ESP32 devices with type === 'valve'
            if (device.deviceId && device.deviceId.startsWith('esp32_') && device.type === 'valve') {
                await this.setupDeviceValveControl(device);
            }
        }

        // Setup the main valve toggle if it exists (for Map page)
        // Wait a bit for devices to load, then setup toggle
        setTimeout(async () => {
            await this.setupMainValveToggle();
        }, 2000);
    }

    /**
     * Load user devices directly from Firebase
     */
    async loadUserDevices() {
        if (!this.currentUser || !this.idToken) {
            return [];
        }

        try {
            const url = `${DB_URL}/users/${this.currentUser.uid}/devices.json?auth=${this.idToken}`;
            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 404) {
                    return [];
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const devicesData = await response.json();
            if (!devicesData) {
                return [];
            }

            // Convert to array format
            const devices = [];
            for (const [deviceId, deviceInfo] of Object.entries(devicesData)) {
                if (deviceInfo && deviceInfo.device_info) {
                    devices.push({
                        deviceId: deviceId,
                        name: deviceInfo.device_info.name || deviceId,
                        zone: deviceInfo.device_info.zone || 'Unknown',
                        type: deviceInfo.device_info.type || 'sensor'
                    });
                }
            }

            return devices;
        } catch (error) {
            console.error('❌ Error loading user devices:', error);
            return [];
        }
    }

    /**
     * Setup valve control for a specific device
     */
    async setupDeviceValveControl(device) {
        if (!this.currentUser || !this.idToken) {
            return;
        }

        const deviceId = device.deviceId;

        // Build valve path (matches existing device structure)
        const valvePath = `/users/${this.currentUser.uid}/devices/${deviceId}/valve_control/valveStatus`;

        console.log(`💧 Setting up valve control for device: ${deviceId}`);
        console.log(`   Path: ${valvePath}`);

        // Read initial valve status
        const initialStatus = await this.readValveStatus(deviceId);
        this.valveStates.set(deviceId, initialStatus);

        // Setup real-time listener (polling every 2 seconds)
        const pollInterval = setInterval(async () => {
            const currentStatus = await this.readValveStatus(deviceId);
            if (currentStatus && currentStatus !== this.valveStates.get(deviceId)) {
                this.valveStates.set(deviceId, currentStatus);
                this.updateValveUI(deviceId, currentStatus);
            }
        }, 2000);

        // Store cleanup function
        this.valveListeners.set(deviceId, () => clearInterval(pollInterval));

        // Update UI with initial status
        this.updateValveUI(deviceId, initialStatus);
    }

    /**
     * Read valve status from Firebase RTDB
     * Path: /users/{userId}/devices/{deviceId}/valve_control/valveStatus
     */
    async readValveStatus(deviceId) {
        if (!this.currentUser || !this.idToken) {
            return null;
        }

        try {
            const path = `/users/${this.currentUser.uid}/devices/${deviceId}/valve_control/valveStatus.json`;
            const url = `${DB_URL}${path}?auth=${this.idToken}`;
            
            const response = await fetch(url);
            
            if (response.status === 404) {
                // Valve status not set yet, default to OFF
                return 'OFF';
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const status = await response.text();
            let cleanStatus = status.trim();
            
            // Remove JSON quotes if present
            if (cleanStatus.startsWith('"') && cleanStatus.endsWith('"')) {
                cleanStatus = cleanStatus.slice(1, -1);
            }

            // Validate and normalize
            cleanStatus = cleanStatus.toUpperCase();
            if (cleanStatus === 'ON' || cleanStatus === 'OFF') {
                return cleanStatus;
            } else {
                console.warn(`⚠️ Invalid valve status: ${cleanStatus}, defaulting to OFF`);
                return 'OFF';
            }
        } catch (error) {
            console.error(`❌ Error reading valve status for ${deviceId}:`, error);
            return null;
        }
    }

    /**
     * Write valve status to Firebase RTDB
     * Path: /users/{userId}/devices/{deviceId}/valve_control/valveStatus
     */
    async writeValveStatus(deviceId, status) {
        if (!this.currentUser || !this.idToken) {
            throw new Error('Authentication required');
        }

        // Validate status
        const normalizedStatus = status.toUpperCase();
        if (normalizedStatus !== 'ON' && normalizedStatus !== 'OFF') {
            throw new Error('Invalid valve status. Must be "ON" or "OFF"');
        }

        try {
            const path = `/users/${this.currentUser.uid}/devices/${deviceId}/valve_control/valveStatus.json`;
            const url = `${DB_URL}${path}?auth=${this.idToken}`;
            
            // Write as JSON string
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(normalizedStatus)
            });

            if (response.status === 401 || response.status === 403) {
                // Token expired, refresh and retry
                this.idToken = await this.currentUser.getIdToken(true);
                const retryResponse = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(normalizedStatus)
                });
                
                if (!retryResponse.ok) {
                    throw new Error(`Failed to write valve status: HTTP ${retryResponse.status}`);
                }
            } else if (!response.ok) {
                throw new Error(`Failed to write valve status: HTTP ${response.status}`);
            }

            // Update local state
            this.valveStates.set(deviceId, normalizedStatus);
            
            console.log(`✅ Valve status written: ${deviceId} = ${normalizedStatus}`);
            return true;
        } catch (error) {
            console.error(`❌ Error writing valve status for ${deviceId}:`, error);
            throw error;
        }
    }

    /**
     * Setup main valve toggle on Map page
     * Finds ESP32 devices in the selected zone and controls the first one with valve control
     */
    async setupMainValveToggle() {
        const valveToggle = document.getElementById('wateringValve');
        if (!valveToggle) {
            console.log('⚠️ Valve toggle not found on Map page');
            return;
        }

        // Wait for devices to load
        let devices = [];
        let attempts = 0;
        while (devices.length === 0 && attempts < 10) {
            if (window.firebaseDashboard) {
                devices = window.firebaseDashboard.getDevices();
            } else {
                devices = await this.loadUserDevices();
            }
            if (devices.length === 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }
        }

        if (devices.length === 0) {
            console.log('⚠️ No devices found');
            valveToggle.disabled = true;
            const statusText = document.getElementById('valveStatusText');
            if (statusText) {
                statusText.textContent = 'No devices found';
            }
            return;
        }

        // Get selected zone or use first available zone
        const selectedZone = localStorage.getItem('selectedZone') || 'A';
        console.log(`🔍 Looking for valve device in Zone ${selectedZone}`);

        // Find ONLY valve devices (type === 'valve') in the selected zone
        const zoneDevices = devices.filter(d => {
            const zone = d.zone || '';
            const zoneId = zone.replace('Zone ', '').trim().toUpperCase();
            const isValveDevice = d.type === 'valve'; // Only valve devices
            return d.deviceId && d.deviceId.startsWith('esp32_') && isValveDevice && zoneId === selectedZone.toUpperCase();
        });

        if (zoneDevices.length === 0) {
            console.log(`⚠️ No valve devices found in Zone ${selectedZone}`);
            // Try to find any valve device (regardless of zone)
            const anyValve = devices.find(d => {
                return d.deviceId && d.deviceId.startsWith('esp32_') && d.type === 'valve';
            });
            if (anyValve) {
                console.log(`✅ Using valve device from Zone ${anyValve.zone || 'Unknown'}: ${anyValve.deviceId}`);
                await this.setupToggleForDevice(anyValve.deviceId, valveToggle);
            } else {
                valveToggle.disabled = true;
                const statusText = document.getElementById('valveStatusText');
                if (statusText) {
                    statusText.textContent = 'No valve device found';
                }
                console.log('⚠️ No valve devices found. Make sure device type is set to "valve" in Firebase.');
            }
            return;
        }

        // Use the first valve device found in the zone
        const targetDevice = zoneDevices[0];
        console.log(`✅ Found valve device: ${targetDevice.deviceId} (type: ${targetDevice.type}) in ${targetDevice.zone || 'Unknown'}`);
        await this.setupToggleForDevice(targetDevice.deviceId, valveToggle);
    }

    /**
     * Setup toggle for a specific device
     */
    async setupToggleForDevice(deviceId, valveToggle) {
        // Prevent duplicate event listeners
        if (valveToggle.dataset.valveSetup === 'true') {
            console.log('⚠️ Toggle already set up, skipping...');
            return;
        }
        valveToggle.dataset.valveSetup = 'true';
        valveToggle.dataset.deviceId = deviceId;

        // Read initial status
        const initialStatus = await this.readValveStatus(deviceId);
        if (initialStatus) {
            valveToggle.checked = (initialStatus === 'ON');
            this.updateValveStatusIndicator(initialStatus);
            console.log(`✅ Initial valve status: ${initialStatus}`);
        } else {
            console.log('⚠️ Could not read initial valve status');
        }

        // Setup toggle handler
        valveToggle.addEventListener('change', async (e) => {
            const newStatus = e.target.checked ? 'ON' : 'OFF';
            
            // Disable toggle while writing
            valveToggle.disabled = true;
            const statusText = document.getElementById('valveStatusText');
            if (statusText) {
                statusText.textContent = 'Updating...';
            }

            try {
                await this.writeValveStatus(deviceId, newStatus);
                
                // Update UI
                this.updateValveStatusIndicator(newStatus);
                
                // Show success feedback
                if (statusText) {
                    statusText.textContent = `Valve ${newStatus}`;
                }
                
                console.log(`✅ Valve toggled: ${deviceId} = ${newStatus}`);
            } catch (error) {
                // Revert toggle on error
                e.target.checked = !e.target.checked;
                console.error('❌ Error toggling valve:', error);
                
                if (statusText) {
                    statusText.textContent = 'Error updating valve';
                }
                
                // Show error message
                alert(`Failed to update valve: ${error.message}`);
            } finally {
                // Re-enable toggle
                valveToggle.disabled = false;
            }
        });

        // Setup periodic status check (sync with ESP32 polling)
        setInterval(async () => {
            const currentStatus = await this.readValveStatus(deviceId);
            if (currentStatus && currentStatus !== (valveToggle.checked ? 'ON' : 'OFF')) {
                valveToggle.checked = (currentStatus === 'ON');
                this.updateValveStatusIndicator(currentStatus);
                console.log(`🔄 Valve status synced: ${currentStatus}`);
            }
        }, 2000);
    }

    /**
     * Update valve status indicator UI
     */
    updateValveStatusIndicator(status) {
        const statusDot = document.getElementById('valveStatusDot');
        const statusText = document.getElementById('valveStatusText');
        
        if (statusDot) {
            statusDot.className = `status-dot ${status === 'ON' ? 'active' : 'inactive'}`;
        }
        
        if (statusText) {
            statusText.textContent = status === 'ON' ? 'Valve ON' : 'Valve OFF';
        }
    }

    /**
     * Update valve UI for a specific device
     */
    updateValveUI(deviceId, status) {
        // Update any UI elements associated with this device
        const deviceElements = document.querySelectorAll(`[data-device-id="${deviceId}"]`);
        deviceElements.forEach(el => {
            const toggle = el.querySelector('.valve-switch');
            if (toggle) {
                toggle.checked = (status === 'ON');
            }
        });
    }

    /**
     * Get valve status for a device
     */
    getValveStatus(deviceId) {
        return this.valveStates.get(deviceId) || 'OFF';
    }

    /**
     * Cleanup listeners
     */
    cleanup() {
        for (const cleanup of this.valveListeners.values()) {
            cleanup();
        }
        this.valveListeners.clear();
        this.valveStates.clear();
    }
}

// Initialize when DOM is ready
let valveControlManager = null;

document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for Firebase Auth to initialize
    setTimeout(() => {
        valveControlManager = new ValveControlManager();
        window.valveControl = valveControlManager;
        
        // If on Map page, also setup toggle when Firebase Dashboard is ready
        if (window.location.pathname.includes('Map.html') || window.location.pathname.includes('map.html')) {
            // Wait for Firebase Dashboard to load devices
            const checkDashboard = setInterval(() => {
                if (window.firebaseDashboard && window.firebaseDashboard.getDevices().length > 0) {
                    clearInterval(checkDashboard);
                    // Setup toggle after devices are loaded
                    if (valveControlManager) {
                        valveControlManager.setupMainValveToggle();
                    }
                }
            }, 500);
            
            // Timeout after 10 seconds
            setTimeout(() => clearInterval(checkDashboard), 10000);
        }
    }, 1000);
});

export { ValveControlManager };

