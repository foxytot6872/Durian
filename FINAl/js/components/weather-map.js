// Weather Map Component - Windy API Integration
class WeatherMapComponent {
    constructor() {
        this.map = null;
        this.windyAPI = null;
        this.isInitialized = false;
        this.currentLocation = { lat: 13.7563, lon: 100.5018 }; // Bangkok, Thailand (default)
    }

    // Initialize the Windy map
    async initMap(containerId = 'windyMap') {
        try {
            // Check if Windy API is available
            if (typeof windyInit === 'undefined') {
                console.error('Windy API not loaded. Please include the Windy script.');
                return false;
            }

            // Initialize Windy
            this.windyAPI = await windyInit({
                key: 'YOUR_WINDY_API_KEY', // You'll need to get this from Windy
                verbose: false,
                callback: () => {
                    console.log('Windy API initialized successfully');
                    this.isInitialized = true;
                }
            });

            // Create map options
            const options = {
                lat: this.currentLocation.lat,
                lon: this.currentLocation.lon,
                zoom: 5,
                level: 850, // Pressure level
                overlay: 'wind', // Default overlay
                units: 'metric'
            };

            // Initialize the map
            this.map = this.windyAPI.map({
                container: containerId,
                options: options
            });

            // Add event listeners
            this.addMapEventListeners();

            return true;
        } catch (error) {
            console.error('Error initializing Windy map:', error);
            return false;
        }
    }

    // Add event listeners for map interactions
    addMapEventListeners() {
        if (!this.map) return;

        // Listen for map click events
        this.map.on('click', (e) => {
            this.onMapClick(e);
        });

        // Listen for overlay changes
        this.map.on('overlay', (overlay) => {
            console.log('Overlay changed to:', overlay);
        });

        // Listen for level changes
        this.map.on('level', (level) => {
            console.log('Level changed to:', level);
        });
    }

    // Handle map click events
    onMapClick(e) {
        const { lat, lon } = e;
        console.log('Map clicked at:', lat, lon);
        
        // You can add custom functionality here
        // For example, show weather data for the clicked location
        this.getWeatherData(lat, lon);
    }

    // Get weather data for a specific location
    async getWeatherData(lat, lon) {
        try {
            // This would typically call a weather API
            // For now, we'll just log the coordinates
            console.log(`Getting weather data for: ${lat}, ${lon}`);
            
            // You can integrate with other weather APIs here
            // Example: OpenWeatherMap, WeatherAPI, etc.
        } catch (error) {
            console.error('Error getting weather data:', error);
        }
    }

    // Change map overlay
    changeOverlay(overlay) {
        if (!this.map) return;
        
        const overlays = ['wind', 'temp', 'pressure', 'clouds', 'precip'];
        if (overlays.includes(overlay)) {
            this.map.setOverlay(overlay);
        }
    }

    // Change pressure level
    changeLevel(level) {
        if (!this.map) return;
        
        const levels = [1000, 925, 850, 700, 600, 500, 400, 300, 250, 200, 150, 100, 70, 50, 30, 20, 10];
        if (levels.includes(level)) {
            this.map.setLevel(level);
        }
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
        if (!this.map) return;
        
        if (show) {
            this.map.showControls();
        } else {
            this.map.hideControls();
        }
    }

    // Destroy the map
    destroy() {
        if (this.map) {
            this.map.destroy();
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
