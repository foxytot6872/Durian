// Firebase Setup Script for Durian Dashboard
// Run this script to initialize your Firebase project

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');

// Your Firebase configuration
const firebaseConfig = {
    // Replace with your actual Firebase config
    apiKey: "your-api-key-here",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Initialize database with sample data
async function initializeDatabase() {
    console.log('🌱 Initializing Durian Farm Database...');
    
    try {
        // Initialize zones
        const zones = {
            'A': {
                zoneId: 'A',
                name: 'North Field',
                status: 'healthy',
                sensorData: {
                    moisture: 68,
                    temperature: 27,
                    humidity: 75,
                    light: 85
                },
                plantCount: 45,
                lastUpdate: new Date()
            },
            'B': {
                zoneId: 'B',
                name: 'South Field',
                status: 'healthy',
                sensorData: {
                    moisture: 62,
                    temperature: 29,
                    humidity: 70,
                    light: 80
                },
                plantCount: 48,
                lastUpdate: new Date()
            },
            'C': {
                zoneId: 'C',
                name: 'East Field',
                status: 'warning',
                sensorData: {
                    moisture: 45,
                    temperature: 32,
                    humidity: 65,
                    light: 75
                },
                plantCount: 42,
                lastUpdate: new Date()
            },
            'D': {
                zoneId: 'D',
                name: 'West Field',
                status: 'healthy',
                sensorData: {
                    moisture: 71,
                    temperature: 26,
                    humidity: 80,
                    light: 90
                },
                plantCount: 49,
                lastUpdate: new Date()
            }
        };

        // Initialize valve controls
        const valveControls = {
            'A': {
                wateringValve: { isOpen: false, lastToggled: new Date() },
                fertilizerValve: { isOpen: false, lastToggled: new Date() },
                pestControlValve: { isOpen: false, lastToggled: new Date() }
            },
            'B': {
                wateringValve: { isOpen: false, lastToggled: new Date() },
                fertilizerValve: { isOpen: false, lastToggled: new Date() },
                pestControlValve: { isOpen: false, lastToggled: new Date() }
            },
            'C': {
                wateringValve: { isOpen: false, lastToggled: new Date() },
                fertilizerValve: { isOpen: false, lastToggled: new Date() },
                pestControlValve: { isOpen: false, lastToggled: new Date() }
            },
            'D': {
                wateringValve: { isOpen: false, lastToggled: new Date() },
                fertilizerValve: { isOpen: false, lastToggled: new Date() },
                pestControlValve: { isOpen: false, lastToggled: new Date() }
            }
        };

        // Initialize weather data
        const weatherData = {
            current: {
                temperature: 28,
                humidity: 75,
                rainfall: 0,
                windSpeed: 5,
                updatedAt: new Date()
            },
            forecast: [
                { date: new Date(), temperature: 28, humidity: 75, rainfall: 0 },
                { date: new Date(Date.now() + 86400000), temperature: 30, humidity: 70, rainfall: 10 },
                { date: new Date(Date.now() + 172800000), temperature: 26, humidity: 80, rainfall: 25 }
            ]
        };

        // Save zones to Firestore
        for (const [zoneId, zoneData] of Object.entries(zones)) {
            await setDoc(doc(db, 'zones', zoneId), zoneData);
            console.log(`✅ Zone ${zoneId} initialized`);
        }

        // Save valve controls
        for (const [zoneId, valveData] of Object.entries(valveControls)) {
            await setDoc(doc(db, 'valveControls', zoneId), valveData);
            console.log(`✅ Valve controls for Zone ${zoneId} initialized`);
        }

        // Save weather data
        await setDoc(doc(db, 'weatherData', 'current'), weatherData.current);
        console.log('✅ Weather data initialized');

        console.log('🎉 Database initialization complete!');
        console.log('Your Durian Dashboard is ready to receive real-time data!');

    } catch (error) {
        console.error('❌ Error initializing database:', error);
    }
}

// Run initialization
initializeDatabase();

module.exports = { app, db, auth };
