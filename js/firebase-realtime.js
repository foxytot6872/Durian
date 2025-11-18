// Firebase Realtime Database Integration for Durian Dashboard
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, set, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB52r0wePBUeJicn29UYGdQXMZiW8NLHG8",
  authDomain: "duriandashboard.firebaseapp.com",
  databaseURL: "https://duriandashboard-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "duriandashboard",
  storageBucket: "duriandashboard.firebasestorage.app",
  messagingSenderId: "969102962743",
  appId: "1:969102962743:web:34f75b8275181f9060cfb2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

class FirebaseRealtimeManager {
  constructor() {
    this.isConnected = false;
    this.realtimeListeners = [];
    this.init();
  }

  async init() {
    try {
      console.log('🔥 Initializing Firebase Realtime Database...');
      this.setupRealtimeListeners();
      this.isConnected = true;
      console.log('✅ Firebase Realtime Database connected!');
    } catch (error) {
      console.error('❌ Firebase connection failed:', error);
    }
  }

  // Setup real-time listeners for all zones
  setupRealtimeListeners() {
    const zones = ['A', 'B', 'C', 'D'];
    
    zones.forEach(zoneId => {
      // Listen to sensor data for each zone
      const sensorRef = ref(database, `sensorData/${zoneId}`);
      const listener = onValue(sensorRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          console.log(`📊 Zone ${zoneId} data:`, data);
          this.updateZoneDisplay(zoneId, data);
        }
      });
      this.realtimeListeners.push(listener);
    });
  }

  // Update zone display with real-time data
  updateZoneDisplay(zoneId, data) {
    console.log(`📊 Updating Zone ${zoneId}:`, data);
    
    // Update zone cards on dashboard
    const zoneCard = document.querySelector(`[data-zone="${zoneId}"]`);
    if (zoneCard) {
      // Update moisture
      const moistureElement = zoneCard.querySelector('.zone-moisture');
      if (moistureElement && data.moisture !== undefined) {
        moistureElement.textContent = `${Math.round(data.moisture)}%`;
        
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
        tempElement.textContent = `${Math.round(data.temperature)}°C`;
      }

      // Update humidity
      const humidityElement = zoneCard.querySelector('.zone-humidity');
      if (humidityElement && data.humidity !== undefined) {
        humidityElement.textContent = `${Math.round(data.humidity)}%`;
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
      
      if (moistureInfo) moistureInfo.textContent = `Moisture: ${Math.round(data.moisture)}%`;
      if (tempInfo) tempInfo.textContent = `Temperature: ${Math.round(data.temperature)}°C`;
      if (humidityInfo) humidityInfo.textContent = `Humidity: ${Math.round(data.humidity)}%`;
    }

    // Update zone metrics
    const metricsGrid = document.querySelector('.zone-metrics-grid');
    if (metricsGrid) {
      const metricElements = metricsGrid.querySelectorAll('.zone-metric');
      metricElements.forEach(metric => {
        const label = metric.querySelector('.metric-label');
        if (label) {
          if (label.textContent.includes('Moisture')) {
            metric.querySelector('.metric-value').textContent = `${Math.round(data.moisture)}%`;
          } else if (label.textContent.includes('Temperature')) {
            metric.querySelector('.metric-value').textContent = `${Math.round(data.temperature)}°C`;
          } else if (label.textContent.includes('Humidity')) {
            metric.querySelector('.metric-value').textContent = `${Math.round(data.humidity)}%`;
          }
        }
      });
    }
  }

  // Send test data (for testing without Arduino)
  async sendTestData() {
    const zones = ['A', 'B', 'C', 'D'];
    
    for (const zone of zones) {
      const testData = {
        temperature: Math.floor(Math.random() * 10) + 25,
        humidity: Math.floor(Math.random() * 20) + 60,
        moisture: Math.floor(Math.random() * 40) + 30,
        zoneId: zone,
        timestamp: Date.now()
      };
      
      try {
        const sensorRef = ref(database, `sensorData/${zone}`);
        await set(sensorRef, testData);
        console.log(`📡 Test data sent for zone ${zone}`);
      } catch (error) {
        console.error(`❌ Error sending test data for zone ${zone}:`, error);
      }
    }
  }

  // Get latest data for a specific zone
  async getZoneData(zoneId) {
    try {
      const sensorRef = ref(database, `sensorData/${zoneId}`);
      const snapshot = await get(sensorRef);
      return snapshot.val();
    } catch (error) {
      console.error(`❌ Error getting data for zone ${zoneId}:`, error);
      return null;
    }
  }

  // Cleanup listeners
  cleanup() {
    this.realtimeListeners.forEach(listener => listener());
    this.realtimeListeners = [];
  }
}

// Initialize Firebase Realtime Database when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.firebaseRealtime = new FirebaseRealtimeManager();
});

export { FirebaseRealtimeManager };
