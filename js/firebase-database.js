// Firebase Database Operations for Durian Dashboard

import { 
    getCollection, 
    getDocument, 
    setDocument, 
    updateDocument, 
    deleteDocument,
    listenToCollection,
    listenToDocument 
} from './firebase-config.js';

// Zone Management
export class ZoneManager {
    constructor() {
        this.collectionName = 'zones';
    }

    // Get all zones
    async getAllZones() {
        return await getCollection(this.collectionName);
    }

    // Get specific zone
    async getZone(zoneId) {
        return await getDocument(this.collectionName, zoneId);
    }

    // Create or update zone
    async saveZone(zoneId, zoneData) {
        return await setDocument(this.collectionName, zoneId, {
            ...zoneData,
            zoneId: zoneId,
            lastUpdated: new Date()
        });
    }

    // Update zone status
    async updateZoneStatus(zoneId, status) {
        return await updateDocument(this.collectionName, zoneId, {
            status: status,
            statusUpdatedAt: new Date()
        });
    }

    // Listen to zone changes
    listenToZones(callback) {
        return listenToCollection(this.collectionName, callback);
    }

    // Listen to specific zone changes
    listenToZone(zoneId, callback) {
        return listenToDocument(this.collectionName, zoneId, callback);
    }
}

// Sensor Data Management
export class SensorManager {
    constructor() {
        this.collectionName = 'sensorData';
    }

    // Get sensor data for a zone
    async getSensorData(zoneId, limitCount = 100) {
        try {
            const { getFirestore, collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
            const db = getFirestore();
            
            const q = query(
                collection(db, this.collectionName),
                where('zoneId', '==', zoneId),
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            );
            
            const querySnapshot = await getDocs(q);
            const data = [];
            querySnapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Save sensor reading
    async saveSensorReading(zoneId, sensorType, value, unit) {
        const readingId = `${zoneId}_${sensorType}_${Date.now()}`;
        return await setDocument(this.collectionName, readingId, {
            zoneId: zoneId,
            sensorType: sensorType,
            value: value,
            unit: unit,
            timestamp: new Date()
        });
    }

    // Listen to real-time sensor data
    listenToSensorData(zoneId, callback) {
        return listenToCollection(this.collectionName, (result) => {
            if (result.success) {
                const filteredData = result.data.filter(item => item.zoneId === zoneId);
                callback({ success: true, data: filteredData });
            } else {
                callback(result);
            }
        });
    }
}

// Valve Control Management
export class ValveManager {
    constructor() {
        this.collectionName = 'valveControls';
    }

    // Get valve status for a zone
    async getValveStatus(zoneId) {
        return await getDocument(this.collectionName, zoneId);
    }

    // Update valve status
    async updateValveStatus(zoneId, valveType, isOpen, settings = {}) {
        const valveData = {
            [`${valveType}Valve`]: {
                isOpen: isOpen,
                lastToggled: new Date(),
                settings: settings
            }
        };

        return await updateDocument(this.collectionName, zoneId, valveData);
    }

    // Get all valve statuses
    async getAllValveStatuses() {
        return await getCollection(this.collectionName);
    }

    // Listen to valve changes
    listenToValveStatus(zoneId, callback) {
        return listenToDocument(this.collectionName, zoneId, callback);
    }
}

// Farm Analytics
export class AnalyticsManager {
    constructor() {
        this.collectionName = 'analytics';
    }

    // Get farm analytics
    async getFarmAnalytics(dateRange = 'week') {
        return await getDocument(this.collectionName, `analytics_${dateRange}`);
    }

    // Save analytics data
    async saveAnalytics(dateRange, data) {
        return await setDocument(this.collectionName, `analytics_${dateRange}`, {
            ...data,
            dateRange: dateRange,
            generatedAt: new Date()
        });
    }

    // Get zone performance
    async getZonePerformance(zoneId, period = 'week') {
        return await getDocument(this.collectionName, `zone_${zoneId}_${period}`);
    }
}

// Camera Feed Management
export class CameraManager {
    constructor() {
        this.collectionName = 'cameraFeeds';
    }

    // Get camera feed for zone
    async getCameraFeed(zoneId) {
        return await getDocument(this.collectionName, zoneId);
    }

    // Update camera status
    async updateCameraStatus(zoneId, isRecording, settings = {}) {
        return await updateDocument(this.collectionName, zoneId, {
            isRecording: isRecording,
            recordingStarted: isRecording ? new Date() : null,
            settings: settings
        });
    }

    // Save camera snapshot
    async saveCameraSnapshot(zoneId, imageUrl, metadata = {}) {
        const snapshotId = `${zoneId}_snapshot_${Date.now()}`;
        return await setDocument('cameraSnapshots', snapshotId, {
            zoneId: zoneId,
            imageUrl: imageUrl,
            metadata: metadata,
            timestamp: new Date()
        });
    }
}

// Disease Detection
export class DiseaseManager {
    constructor() {
        this.collectionName = 'diseaseDetection';
    }

    // Get disease alerts for zone
    async getDiseaseAlerts(zoneId) {
        try {
            const { getFirestore, collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
            const db = getFirestore();
            
            const q = query(
                collection(db, this.collectionName),
                where('zoneId', '==', zoneId),
                orderBy('detectedAt', 'desc'),
                limit(50)
            );
            
            const querySnapshot = await getDocs(q);
            const data = [];
            querySnapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Report disease detection
    async reportDiseaseDetection(zoneId, diseaseType, severity, confidence, imageUrl) {
        const detectionId = `${zoneId}_disease_${Date.now()}`;
        return await setDocument(this.collectionName, detectionId, {
            zoneId: zoneId,
            diseaseType: diseaseType,
            severity: severity,
            confidence: confidence,
            imageUrl: imageUrl,
            detectedAt: new Date(),
            status: 'new'
        });
    }

    // Update disease status
    async updateDiseaseStatus(detectionId, status, treatment = null) {
        return await updateDocument(this.collectionName, detectionId, {
            status: status,
            treatment: treatment,
            updatedAt: new Date()
        });
    }
}

// Weather Data
export class WeatherManager {
    constructor() {
        this.collectionName = 'weatherData';
    }

    // Get current weather
    async getCurrentWeather() {
        return await getDocument(this.collectionName, 'current');
    }

    // Save weather data
    async saveWeatherData(weatherData) {
        return await setDocument(this.collectionName, 'current', {
            ...weatherData,
            updatedAt: new Date()
        });
    }

    // Get weather forecast
    async getWeatherForecast() {
        return await getDocument(this.collectionName, 'forecast');
    }
}

// Export managers
export const zoneManager = new ZoneManager();
export const sensorManager = new SensorManager();
export const valveManager = new ValveManager();
export const analyticsManager = new AnalyticsManager();
export const cameraManager = new CameraManager();
export const diseaseManager = new DiseaseManager();
export const weatherManager = new WeatherManager();
