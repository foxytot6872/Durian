// Local Development Server for Durian Dashboard
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static('.'));

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/finance', (req, res) => {
    res.sendFile(path.join(__dirname, 'Finance.html'));
});

app.get('/map', (req, res) => {
    res.sendFile(path.join(__dirname, 'Map.html'));
});

app.get('/soil', (req, res) => {
    res.sendFile(path.join(__dirname, 'Soil.html'));
});

app.get('/weather', (req, res) => {
    res.sendFile(path.join(__dirname, 'weather.html'));
});

// API endpoints for testing
app.get('/api/sensor-data', (req, res) => {
    res.json({
        zoneA: {
            moisture: Math.floor(Math.random() * 40) + 30,
            temperature: Math.floor(Math.random() * 10) + 25,
            humidity: Math.floor(Math.random() * 20) + 60,
            status: 'healthy'
        },
        zoneB: {
            moisture: Math.floor(Math.random() * 40) + 30,
            temperature: Math.floor(Math.random() * 10) + 25,
            humidity: Math.floor(Math.random() * 20) + 60,
            status: 'healthy'
        },
        zoneC: {
            moisture: Math.floor(Math.random() * 30) + 20,
            temperature: Math.floor(Math.random() * 15) + 30,
            humidity: Math.floor(Math.random() * 15) + 50,
            status: 'warning'
        },
        zoneD: {
            moisture: Math.floor(Math.random() * 40) + 30,
            temperature: Math.floor(Math.random() * 10) + 25,
            humidity: Math.floor(Math.random() * 20) + 60,
            status: 'healthy'
        }
    });
});

app.get('/api/valve-status', (req, res) => {
    res.json({
        zoneA: {
            wateringValve: { isOpen: false },
            fertilizerValve: { isOpen: false },
            pestControlValve: { isOpen: false }
        },
        zoneB: {
            wateringValve: { isOpen: false },
            fertilizerValve: { isOpen: false },
            pestControlValve: { isOpen: false }
        },
        zoneC: {
            wateringValve: { isOpen: false },
            fertilizerValve: { isOpen: false },
            pestControlValve: { isOpen: false }
        },
        zoneD: {
            wateringValve: { isOpen: false },
            fertilizerValve: { isOpen: false },
            pestControlValve: { isOpen: false }
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log('🌱 Durian Dashboard Server Running!');
    console.log(`📱 Local: http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/`);
    console.log(`💰 Finance: http://localhost:${PORT}/finance`);
    console.log(`🗺️ Map: http://localhost:${PORT}/map`);
    console.log(`🌱 Soil: http://localhost:${PORT}/soil`);
    console.log(`🌤️ Weather: http://localhost:${PORT}/weather`);
    console.log('');
    console.log('🔧 API Endpoints:');
    console.log(`📡 Sensor Data: http://localhost:${PORT}/api/sensor-data`);
    console.log(`🔧 Valve Status: http://localhost:${PORT}/api/valve-status`);
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});
