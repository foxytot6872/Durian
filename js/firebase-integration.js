// Firebase Integration for Durian Dashboard Frontend

import { 
    zoneManager, 
    sensorManager, 
    valveManager, 
    cameraManager, 
    diseaseManager,
    weatherManager 
} from './firebase-database.js';

// Real-time Data Integration
export class FirebaseIntegration {
    constructor() {
        this.isInitialized = false;
        this.listeners = new Map();
        this.currentZone = null;
    }

    // Initialize Firebase integration
    async initialize() {
        try {
            console.log('Initializing Firebase integration...');
            
            // Set up real-time listeners
            this.setupRealtimeListeners();
            
            this.isInitialized = true;
            console.log('Firebase integration initialized successfully');
            
            return { success: true };
        } catch (error) {
            console.error('Failed to initialize Firebase:', error);
            return { success: false, error: error.message };
        }
    }

    // Setup real-time listeners
    setupRealtimeListeners() {
        // Listen to zone changes
        this.listeners.set('zones', zoneManager.listenToZones((result) => {
            if (result.success) {
                this.updateZoneDisplay(result.data);
            }
        }));

        // Listen to sensor data
        this.listeners.set('sensors', sensorManager.listenToSensorData('A', (result) => {
            if (result.success) {
                this.updateSensorDisplay(result.data);
            }
        }));

        // Listen to valve status
        this.listeners.set('valves', valveManager.listenToValveStatus('A', (result) => {
            if (result.success) {
                this.updateValveDisplay(result.data);
            }
        }));
    }

    // Update zone display with real-time data
    updateZoneDisplay(zones) {
        zones.forEach(zone => {
            const zoneElement = document.querySelector(`[data-zone="${zone.zoneId}"]`);
            if (zoneElement) {
                this.updateZoneCard(zoneElement, zone);
            }
        });
    }

    // Update individual zone card
    updateZoneCard(zoneElement, zoneData) {
        // Update zone status
        const statusElement = zoneElement.querySelector('.zone-status');
        if (statusElement) {
            statusElement.textContent = zoneData.status || 'Unknown';
            statusElement.className = `zone-status ${zoneData.status?.toLowerCase()}`;
        }

        // Update metrics
        const metrics = zoneElement.querySelectorAll('.metric-value');
        if (metrics.length >= 3 && zoneData.sensorData) {
            metrics[0].textContent = `${zoneData.sensorData.moisture || 0}%`;
            metrics[1].textContent = `${zoneData.sensorData.temperature || 0}°C`;
            metrics[2].textContent = `${zoneData.sensorData.plantCount || 0}/50`;
        }
    }

    // Update sensor display
    updateSensorDisplay(sensorData) {
        if (!sensorData || sensorData.length === 0) return;

        const latestData = sensorData[0]; // Most recent reading
        
        // Update zone metrics on Map page
        this.updateZoneMetrics(latestData);
    }

    // Update zone metrics on Map page
    updateZoneMetrics(sensorData) {
        const metricsContainer = document.getElementById('zoneMetrics');
        if (!metricsContainer) return;

        // Update or create metric elements
        const metrics = [
            { label: 'Soil Moisture', value: `${sensorData.moisture || 0}%` },
            { label: 'Temperature', value: `${sensorData.temperature || 0}°C` },
            { label: 'Humidity', value: `${sensorData.humidity || 0}%` },
            { label: 'Plants', value: `${sensorData.plantCount || 0}/50` },
            { label: 'Last Update', value: this.formatTimestamp(sensorData.timestamp) }
        ];

        metricsContainer.innerHTML = '';
        metrics.forEach(metric => {
            const metricDiv = document.createElement('div');
            metricDiv.className = 'zone-metric';
            metricDiv.innerHTML = `
                <span class="metric-label">${metric.label}</span>
                <span class="metric-value">${metric.value}</span>
            `;
            metricsContainer.appendChild(metricDiv);
        });
    }

    // Update valve display
    updateValveDisplay(valveData) {
        if (!valveData) return;

        // Update watering valve
        if (valveData.wateringValve) {
            const wateringToggle = document.getElementById('wateringValve');
            if (wateringToggle) {
                wateringToggle.checked = valveData.wateringValve.isOpen;
            }
        }

        // Update fertilizer valve
        if (valveData.fertilizerValve) {
            const fertilizerToggle = document.getElementById('fertilizerValve');
            if (fertilizerToggle) {
                fertilizerToggle.checked = valveData.fertilizerValve.isOpen;
            }
        }

        // Update pest control valve
        if (valveData.pestControlValve) {
            const pestToggle = document.getElementById('pestControlValve');
            if (pestToggle) {
                pestToggle.checked = valveData.pestControlValve.isOpen;
            }
        }
    }

    // Switch to different zone
    async switchZone(zoneId) {
        this.currentZone = zoneId;
        
        // Update listeners for new zone
        this.listeners.forEach((listener, key) => {
            if (listener && typeof listener === 'function') {
                listener(); // Unsubscribe old listener
            }
        });

        // Set up new listeners for the selected zone
        this.setupZoneListeners(zoneId);
    }

    // Setup listeners for specific zone
    setupZoneListeners(zoneId) {
        // Listen to sensor data for this zone
        this.listeners.set('sensors', sensorManager.listenToSensorData(zoneId, (result) => {
            if (result.success) {
                this.updateSensorDisplay(result.data);
            }
        }));

        // Listen to valve status for this zone
        this.listeners.set('valves', valveManager.listenToValveStatus(zoneId, (result) => {
            if (result.success) {
                this.updateValveDisplay(result.data);
            }
        }));
    }

    // Control valve
    async controlValve(zoneId, valveType, isOpen, settings = {}) {
        try {
            const result = await valveManager.updateValveStatus(zoneId, valveType, isOpen, settings);
            
            if (result.success) {
                console.log(`${valveType} valve ${isOpen ? 'opened' : 'closed'} for zone ${zoneId}`);
                
                // Show notification
                this.showNotification(
                    `${valveType.charAt(0).toUpperCase() + valveType.slice(1)} valve ${isOpen ? 'activated' : 'deactivated'}`,
                    isOpen ? 'success' : 'info'
                );
            }
            
            return result;
        } catch (error) {
            console.error('Failed to control valve:', error);
            this.showNotification('Failed to control valve', 'error');
            return { success: false, error: error.message };
        }
    }

    // Save sensor reading
    async saveSensorReading(zoneId, sensorType, value, unit) {
        try {
            const result = await sensorManager.saveSensorReading(zoneId, sensorType, value, unit);
            
            if (result.success) {
                console.log(`Sensor reading saved: ${sensorType} = ${value} ${unit}`);
            }
            
            return result;
        } catch (error) {
            console.error('Failed to save sensor reading:', error);
            return { success: false, error: error.message };
        }
    }

    // Report disease detection
    async reportDisease(zoneId, diseaseType, severity, confidence, imageUrl) {
        try {
            const result = await diseaseManager.reportDiseaseDetection(
                zoneId, diseaseType, severity, confidence, imageUrl
            );
            
            if (result.success) {
                this.showNotification(`Disease detected: ${diseaseType}`, 'warning');
                this.updateDiseaseStatus();
            }
            
            return result;
        } catch (error) {
            console.error('Failed to report disease:', error);
            return { success: false, error: error.message };
        }
    }

    // Update disease status display
    async updateDiseaseStatus() {
        try {
            const zoneId = this.currentZone || localStorage.getItem('selectedZone') || 'A';
            const result = await diseaseManager.getDiseaseAlerts(zoneId);
            
            if (result.success && result.data.length > 0) {
                this.updateStatusCards(result.data);
            }
        } catch (error) {
            console.error('Failed to update disease status:', error);
        }
    }

    // Update status cards with disease data
    updateStatusCards(diseaseData) {
        const statusCardsGrid = document.getElementById('statusCardsGrid');
        if (!statusCardsGrid) return;

        // Add disease cards to existing status cards
        diseaseData.forEach(disease => {
            const card = document.createElement('div');
            card.className = `status-card ${disease.severity}`;
            card.setAttribute('data-type', 'disease');
            
            card.innerHTML = `
                <div class="status-card-header">
                    <h4 class="status-card-title">Disease Alert</h4>
                    <span class="status-badge ${disease.severity}">${disease.severity}</span>
                </div>
                <div class="status-card-content">
                    <p><strong>${disease.diseaseType}</strong> detected with ${disease.confidence}% confidence</p>
                    <small style="color: #94a3b8;">${this.formatTimestamp(disease.detectedAt)}</small>
                </div>
            `;
            
            statusCardsGrid.appendChild(card);
        });
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // Get notification icon based on type
    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // Format timestamp
    formatTimestamp(timestamp) {
        if (!timestamp) return 'Unknown';
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        return `${diffDays} days ago`;
    }

    // Cleanup listeners
    cleanup() {
        this.listeners.forEach((listener, key) => {
            if (listener && typeof listener === 'function') {
                listener();
            }
        });
        this.listeners.clear();
    }
}

// Initialize Firebase integration
export const firebaseIntegration = new FirebaseIntegration();

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    firebaseIntegration.initialize();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    firebaseIntegration.cleanup();
});
