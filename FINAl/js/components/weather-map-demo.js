// Weather Map Component - Demo Version (No API Key Required)
class WeatherMapComponent {
    constructor() {
        this.map = null;
        this.isInitialized = false;
        this.currentLocation = { lat: 13.7563, lon: 100.5018 }; // Bangkok, Thailand
        this.currentOverlay = 'wind';
        this.currentLevel = 850;
    }

    // Initialize the demo map (using Leaflet as fallback)
    async initMap(containerId = 'windyMap') {
        try {
            // Check if Leaflet is available
            if (typeof L === 'undefined') {
                // Load Leaflet if not available
                await this.loadLeaflet();
            }

            // Create a simple Leaflet map as demo
            this.map = L.map(containerId).setView([this.currentLocation.lat, this.currentLocation.lon], 5);

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);

            // Add some demo weather markers
            this.addDemoWeatherMarkers();

            this.isInitialized = true;
            console.log('Demo weather map initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing demo weather map:', error);
            this.showMapError(containerId);
            return false;
        }
    }

    // Load Leaflet library
    async loadLeaflet() {
        return new Promise((resolve, reject) => {
            // Load Leaflet CSS
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);

            // Load Leaflet JS
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Add demo weather markers
    addDemoWeatherMarkers() {
        if (!this.map) return;

        const weatherStations = [
            { lat: 13.7563, lon: 100.5018, name: 'Bangkok', temp: '28°C', wind: '12 km/h', condition: 'sunny' },
            { lat: 14.0583, lon: 100.6081, name: 'Ayutthaya', temp: '27°C', wind: '10 km/h', condition: 'cloudy' },
            { lat: 12.2388, lon: 99.9619, name: 'Hua Hin', temp: '29°C', wind: '15 km/h', condition: 'sunny' },
            { lat: 18.7883, lon: 98.9853, name: 'Chiang Mai', temp: '25°C', wind: '8 km/h', condition: 'cloudy' },
            { lat: 7.8804, lon: 98.3923, name: 'Phuket', temp: '31°C', wind: '18 km/h', condition: 'rainy' }
        ];

        weatherStations.forEach(station => {
            const icon = this.getWeatherIcon(station.condition);
            const marker = L.marker([station.lat, station.lon], { icon: icon }).addTo(this.map);
            
            marker.bindPopup(`
                <div class="weather-popup">
                    <h4>${station.name}</h4>
                    <p><strong>Temperature:</strong> ${station.temp}</p>
                    <p><strong>Wind:</strong> ${station.wind}</p>
                    <p><strong>Condition:</strong> ${station.condition}</p>
                </div>
            `);
        });
    }

    // Get weather icon based on condition
    getWeatherIcon(condition) {
        const iconMap = {
            sunny: '☀️',
            cloudy: '☁️',
            rainy: '🌧️',
            stormy: '⛈️'
        };

        return L.divIcon({
            html: `<div class="weather-marker">${iconMap[condition] || '🌤️'}</div>`,
            className: 'weather-marker-container',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
    }

    // Show map error
    showMapError(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="map-loading">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Demo map loaded. For full weather data, please configure Windy API.</span>
                </div>
            `;
        }
    }

    // Change map overlay (demo version)
    changeOverlay(overlay) {
        this.currentOverlay = overlay;
        console.log(`Overlay changed to: ${overlay}`);
        
        // In a real implementation, this would change the map overlay
        // For demo, we'll just update the map title
        const mapHeader = document.querySelector('.map-header h3');
        if (mapHeader) {
            mapHeader.textContent = `Weather Map - ${overlay.charAt(0).toUpperCase() + overlay.slice(1)}`;
        }
    }

    // Change pressure level (demo version)
    changeLevel(level) {
        this.currentLevel = level;
        console.log(`Level changed to: ${level} hPa`);
        
        // In a real implementation, this would change the pressure level
        // For demo, we'll just log the change
    }

    // Set map center and zoom
    setView(lat, lon, zoom = 5) {
        if (!this.map) return;
        
        this.map.setView([lat, lon], zoom);
        this.currentLocation = { lat, lon };
    }

    // Get current map center
    getCurrentLocation() {
        return this.currentLocation;
    }

    // Show/hide map controls
    toggleControls(show = true) {
        // Demo version - controls are always visible
        console.log(`Controls ${show ? 'shown' : 'hidden'}`);
    }

    // Destroy the map
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
            this.isInitialized = false;
        }
    }

    // Get available overlays
    getAvailableOverlays() {
        return [
            { id: 'wind', name: 'Wind', icon: 'fas fa-wind' },
            { id: 'temp', name: 'Temperature', icon: 'fas fa-thermometer-half' },
            { id: 'pressure', name: 'Pressure', icon: 'fas fa-tachometer-alt' },
            { id: 'clouds', name: 'Clouds', icon: 'fas fa-cloud' },
            { id: 'precip', name: 'Precipitation', icon: 'fas fa-cloud-rain' }
        ];
    }

    // Get available levels
    getAvailableLevels() {
        return [
            { value: 1000, name: 'Surface (1000 hPa)' },
            { value: 925, name: '925 hPa' },
            { value: 850, name: '850 hPa' },
            { value: 700, name: '700 hPa' },
            { value: 500, name: '500 hPa' },
            { value: 300, name: '300 hPa' },
            { value: 200, name: '200 hPa' },
            { value: 100, name: '100 hPa' }
        ];
    }
}

// Export for use in other modules
window.WeatherMapComponent = WeatherMapComponent;
