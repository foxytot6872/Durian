// Firebase Integration for Durian Dashboard
import { firestoreManager } from './firebase-database.js';

class FirebaseIntegrationManager {
  constructor() {
    this.isConnected = false;
    this.realtimeListeners = [];
    this.init();
  }

  async init() {
    try {
      console.log('🌱 Initializing Firebase integration...');
      this.setupRealtimeData();
      this.setupValveControl();
      this.isConnected = true;
      console.log('✅ Firebase integration ready!');
    } catch (error) {
      console.error('❌ Firebase integration failed:', error);
    }
  }

  // Setup real-time data listeners
  setupRealtimeData() {
    // Listen for sensor data from all zones
    const zones = ['A', 'B', 'C', 'D'];
    
    zones.forEach(zoneId => {
      const listener = firestoreManager.setupZoneListener(zoneId, (data) => {
        this.updateZoneDisplay(zoneId, data);
      });
      this.realtimeListeners.push(listener);
    });
  }

  // Update zone display with real-time data
  updateZoneDisplay(zoneId, data) {
    console.log(`📊 Zone ${zoneId} data:`, data);
    
    // Update zone cards on dashboard
    const zoneCard = document.querySelector(`[data-zone="${zoneId}"]`);
    if (zoneCard) {
      // Update moisture
      const moistureElement = zoneCard.querySelector('.zone-moisture');
      if (moistureElement && data.moisture !== undefined) {
        moistureElement.textContent = `${data.moisture}%`;
        
        // Update moisture status color
        const statusIndicator = zoneCard.querySelector('.zone-status');
        if (statusIndicator) {
          if (data.moisture < 30) {
            statusIndicator.className = 'zone-status critical';
          } else if (data.moisture < 50) {
            statusIndicator.className = 'zone-status warning';
          } else {
            statusIndicator.className = 'zone-status healthy';
          }
        }
      }

      // Update temperature
      const tempElement = zoneCard.querySelector('.zone-temperature');
      if (tempElement && data.temperature !== undefined) {
        tempElement.textContent = `${data.temperature}°C`;
      }

      // Update humidity
      const humidityElement = zoneCard.querySelector('.zone-humidity');
      if (humidityElement && data.humidity !== undefined) {
        humidityElement.textContent = `${data.humidity}%`;
      }
    }

    // Update map page if currently viewing
    if (window.location.pathname.includes('Map.html')) {
      this.updateMapPage(zoneId, data);
    }
  }

  // Update map page with real-time data
  updateMapPage(zoneId, data) {
    // Update camera feed info
    const cameraInfo = document.querySelector('.camera-info');
    if (cameraInfo) {
      const moistureInfo = cameraInfo.querySelector('.camera-moisture');
      const tempInfo = cameraInfo.querySelector('.camera-temperature');
      const humidityInfo = cameraInfo.querySelector('.camera-humidity');
      
      if (moistureInfo) moistureInfo.textContent = `Moisture: ${data.moisture}%`;
      if (tempInfo) tempInfo.textContent = `Temperature: ${data.temperature}°C`;
      if (humidityInfo) humidityInfo.textContent = `Humidity: ${data.humidity}%`;
    }

    // Update zone metrics
    const metricsGrid = document.querySelector('.zone-metrics-grid');
    if (metricsGrid) {
      const metricElements = metricsGrid.querySelectorAll('.zone-metric');
      metricElements.forEach(metric => {
        const label = metric.querySelector('.metric-label');
        if (label) {
          if (label.textContent.includes('Moisture')) {
            metric.querySelector('.metric-value').textContent = `${data.moisture}%`;
          } else if (label.textContent.includes('Temperature')) {
            metric.querySelector('.metric-value').textContent = `${data.temperature}°C`;
          } else if (label.textContent.includes('Humidity')) {
            metric.querySelector('.metric-value').textContent = `${data.humidity}%`;
          }
        }
      });
    }
  }

  // Setup valve control
  setupValveControl() {
    // Listen for valve control changes
    const valveButtons = document.querySelectorAll('.valve-toggle');
    valveButtons.forEach(button => {
      button.addEventListener('click', async (e) => {
        const zoneId = e.target.closest('.valve-control-card').dataset.zone;
        const valveType = e.target.dataset.valve;
        const isOn = e.target.checked;
        
        try {
          await firestoreManager.updateValveStatus(zoneId, valveType, isOn);
          console.log(`🔧 Valve ${valveType} for zone ${zoneId} set to ${isOn ? 'ON' : 'OFF'}`);
        } catch (error) {
          console.error('❌ Error updating valve:', error);
        }
      });
    });
  }

  // Send test data (for testing without Arduino)
  async sendTestData() {
    const zones = ['A', 'B', 'C', 'D'];
    
    for (const zone of zones) {
      const testData = {
        moisture: Math.floor(Math.random() * 40) + 30,
        temperature: Math.floor(Math.random() * 10) + 25,
        humidity: Math.floor(Math.random() * 20) + 60,
        ph: Math.random() * 2 + 6,
        light: Math.floor(Math.random() * 1000) + 200
      };
      
      try {
        await firestoreManager.addSensorData(zone, testData);
        console.log(`📡 Test data sent for zone ${zone}`);
      } catch (error) {
        console.error(`❌ Error sending test data for zone ${zone}:`, error);
      }
    }
  }

  // Cleanup listeners
  cleanup() {
    this.realtimeListeners.forEach(listener => listener());
    this.realtimeListeners = [];
  }
}

// Initialize Firebase integration when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.firebaseIntegration = new FirebaseIntegrationManager();
});

export { FirebaseIntegrationManager };