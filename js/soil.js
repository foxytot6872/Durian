// Soil Analysis Page JavaScript - Uses Firebase Dashboard Manager
class SoilDashboard {
    constructor() {
        this.selectedZone = null;
        this.firebaseDashboard = null;
        this.zones = [];
        this.init();
    }

    init() {
        this.waitForFirebase();
    }

    waitForFirebase() {
        if (window.firebaseDashboard) {
            this.firebaseDashboard = window.firebaseDashboard;
            this.setupFirebaseListener();
            this.loadZones();
        } else {
            setTimeout(() => this.waitForFirebase(), 500);
        }
    }

    setupFirebaseListener() {
        if (this.firebaseDashboard) {
            // Register callback to be notified when data updates
            this.firebaseDashboard.onUpdate(() => {
                this.updateSoilDisplay();
            });
            
            // Also set up polling as backup (updates every 5 seconds)
            setInterval(() => {
                this.updateSoilDisplay();
            }, 5000);
            
            // Initial update
            this.loadZones();
            this.updateSoilDisplay();
        }
    }

    loadZones() {
        if (!this.firebaseDashboard) return;

        const allDevices = this.firebaseDashboard.getDevices();
        
        // Group devices by zone
        const zonesMap = new Map();
        for (const device of allDevices) {
            const zone = device.zone;
            if (!zone) continue;
            
            if (!zonesMap.has(zone)) {
                zonesMap.set(zone, []);
            }
            zonesMap.get(zone).push(device);
        }

        this.zones = Array.from(zonesMap.keys()).sort((a, b) => {
            const zoneA = a.replace('Zone ', '').trim();
            const zoneB = b.replace('Zone ', '').trim();
            return zoneA.localeCompare(zoneB);
        });

        this.renderZoneButtons();

        // Select first zone if none selected
        if (!this.selectedZone && this.zones.length > 0) {
            this.selectZone(this.zones[0]);
        }
    }

    renderZoneButtons() {
        const container = document.getElementById('zoneButtonsContainer');
        if (!container) return;

        if (this.zones.length === 0) {
            container.innerHTML = '<p style="color: #718096; padding: 1rem;">No zones with devices found. Claim a device to get started.</p>';
            return;
        }

        container.innerHTML = '';
        
        this.zones.forEach(zone => {
            const zoneLetter = zone.replace('Zone ', '').trim();
            const button = document.createElement('button');
            button.className = 'zone-btn';
            button.setAttribute('data-zone', zoneLetter);
            button.textContent = zone;
            button.style.cssText = 'padding: 0.5rem 1rem; border: 2px solid #ddd; background: white; color: #333; border-radius: 5px; cursor: pointer;';
            
            if (this.selectedZone === zone) {
                button.classList.add('active');
                button.style.background = '#4CAF50';
                button.style.color = 'white';
                button.style.border = '2px solid #4CAF50';
            }

            button.addEventListener('click', () => {
                this.selectZone(zone);
            });

            container.appendChild(button);
        });
    }

    selectZone(zone) {
        this.selectedZone = zone;
        this.renderZoneButtons();
        this.updateSoilDisplay();
        this.updateZoneStatus();
    }

    updateZoneStatus() {
        const statusEl = document.getElementById('zone-status');
        if (!statusEl) return;

        if (!this.selectedZone) {
            statusEl.innerHTML = '📡 Please select a zone';
            statusEl.style.background = '#f0f0f0';
            statusEl.style.color = '#666';
            return;
        }

        const devices = this.firebaseDashboard.getDevicesByZone(this.selectedZone);
        if (devices.length === 0) {
            statusEl.innerHTML = `📡 No devices found for ${this.selectedZone}`;
            statusEl.style.background = '#f0f0f0';
            statusEl.style.color = '#666';
            return;
        }

        const device = devices[0];
        if (device.sensorData && device.sensorData.timestamp) {
            const timestamp = this.formatTimestamp(device.sensorData.timestamp);
            statusEl.innerHTML = `✅ Live data from ${this.selectedZone} - Last update: ${timestamp}`;
            statusEl.style.background = '#d4edda';
            statusEl.style.color = '#155724';
        } else {
            statusEl.innerHTML = `📡 Waiting for sensor data from ${this.selectedZone}...`;
            statusEl.style.background = '#f0f0f0';
            statusEl.style.color = '#666';
        }
    }

    updateSoilDisplay() {
        if (!this.firebaseDashboard || !this.selectedZone) return;

        const devices = this.firebaseDashboard.getDevicesByZone(this.selectedZone);
        if (devices.length === 0) {
            this.clearDisplay();
            return;
        }

        // Use first device's sensor data (or aggregate if multiple)
        const device = devices[0];
        const sensorData = device.sensorData;

        if (!sensorData) {
            this.clearDisplay();
            return;
        }

        // Update all soil metrics
        this.updateMetric('soil-moisture', sensorData.moisture, '%', 'moisture-change', (val) => {
            if (val < 30) return { text: 'Low', class: 'negative' };
            if (val < 50) return { text: 'Moderate', class: 'warning' };
            return { text: 'Optimal', class: 'positive' };
        });

        this.updateMetric('soil-ph', sensorData.ph, '', 'ph-status', (val) => {
            if (val < 6.0 || val > 7.5) return { text: 'Needs Adjustment', class: 'negative' };
            return { text: 'Optimal', class: 'positive' };
        }, true);

        this.updateMetric('soil-temperature', sensorData.temperature, '°C', 'temp-change', (val) => {
            if (val < 20 || val > 35) return { text: 'Extreme', class: 'negative' };
            if (val < 25 || val > 30) return { text: 'Moderate', class: 'warning' };
            return { text: 'Optimal', class: 'positive' };
        });

        this.updateMetric('soil-ec', sensorData.ec, ' µS/cm', 'ec-status', (val) => {
            if (val > 2000) return { text: 'High', class: 'warning' };
            return { text: 'Normal', class: 'positive' };
        });

        this.updateMetric('soil-nitrogen', sensorData.n, ' mg/kg', 'nitrogen-status', (val) => {
            if (val < 10) return { text: 'Low', class: 'negative' };
            return { text: 'Optimal', class: 'positive' };
        });

        this.updateMetric('soil-phosphorus', sensorData.p, ' mg/kg', 'phosphorus-status', (val) => {
            if (val < 5) return { text: 'Low', class: 'negative' };
            return { text: 'Optimal', class: 'positive' };
        });

        this.updateMetric('soil-potassium', sensorData.k, ' mg/kg', 'potassium-status', (val) => {
            if (val < 5) return { text: 'Low', class: 'negative' };
            return { text: 'Optimal', class: 'positive' };
        });

        this.updateZoneStatus();
    }

    updateMetric(elementId, value, unit, statusId, statusFn, isDecimal = false) {
        const element = document.getElementById(elementId);
        const statusElement = document.getElementById(statusId);
        
        if (element) {
            if (value !== undefined && value !== null) {
                if (isDecimal) {
                    element.textContent = value.toFixed(1) + unit;
                } else {
                    element.textContent = Math.round(value) + unit;
                }
            } else {
                element.textContent = '--' + unit;
            }
        }

        if (statusElement && value !== undefined && value !== null) {
            const status = statusFn(value);
            statusElement.textContent = status.text;
            statusElement.className = `stat-change ${status.class}`;
        } else if (statusElement) {
            statusElement.textContent = 'No Data';
            statusElement.className = 'stat-change warning';
        }
    }

    clearDisplay() {
        const metrics = ['soil-moisture', 'soil-ph', 'soil-temperature', 'soil-ec', 'soil-nitrogen', 'soil-phosphorus', 'soil-potassium'];
        const statuses = ['moisture-change', 'ph-status', 'temp-change', 'ec-status', 'nitrogen-status', 'phosphorus-status', 'potassium-status'];
        
        metrics.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '--';
        });
        
        statuses.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = 'No Data';
                el.className = 'stat-change warning';
            }
        });
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return 'Never';
        
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff > 86400000) {
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
}

// Initialize soil dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.soilDashboard = new SoilDashboard();
});
