// Weather Dashboard Application
class WeatherDashboard {
    constructor() {
        this.weatherMap = null;
        this.temperatureChart = null;
        this.windChart = null;
        this.currentLocation = { lat: 13.7563, lon: 100.5018 }; // Bangkok, Thailand
        this.weatherData = {
            current: {
                temperature: 28,
                windSpeed: 12,
                humidity: 75,
                visibility: 10
            },
            forecast: [],
            alerts: []
        };
        
        this.init();
    }

    // Initialize the weather dashboard
    async init() {
        this.initializeCharts();
        this.initializeEventListeners();
        this.loadWeatherData();
        
        // Initialize Windy map after a short delay to ensure API is loaded
        setTimeout(() => {
            this.initializeWeatherMap();
        }, 1000);
    }

    // Initialize weather charts
    initializeCharts() {
        this.createTemperatureChart();
        this.createWindChart();
    }

    // Create temperature forecast chart
    createTemperatureChart() {
        const ctx = document.getElementById('temperatureChart');
        if (!ctx) return;

        this.temperatureChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
                datasets: [{
                    label: 'Temperature (°C)',
                    data: [26, 25, 24, 27, 30, 32, 29, 28],
                    borderColor: 'rgb(255, 107, 107)',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgb(255, 107, 107)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '°C';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                elements: {
                    point: {
                        hoverRadius: 8
                    }
                }
            }
        });
    }

    // Create wind speed and direction chart
    createWindChart() {
        const ctx = document.getElementById('windChart');
        if (!ctx) return;

        this.windChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
                datasets: [{
                    label: 'Wind Speed (km/h)',
                    data: [8, 12, 15, 10, 6, 9, 11, 7],
                    backgroundColor: [
                        'rgba(79, 172, 254, 0.8)',
                        'rgba(79, 172, 254, 0.8)',
                        'rgba(79, 172, 254, 0.8)',
                        'rgba(79, 172, 254, 0.8)',
                        'rgba(79, 172, 254, 0.8)',
                        'rgba(79, 172, 254, 0.8)',
                        'rgba(79, 172, 254, 0.8)',
                        'rgba(79, 172, 254, 0.8)'
                    ],
                    borderColor: 'rgb(79, 172, 254)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + ' km/h';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Initialize Windy weather map
    async initializeWeatherMap() {
        try {
            this.weatherMap = new WeatherMapComponent();
            const success = await this.weatherMap.initMap('windyMap');
            
            if (success) {
                console.log('Weather map initialized successfully');
                this.setupMapControls();
            } else {
                console.error('Failed to initialize weather map');
                this.showMapError();
            }
        } catch (error) {
            console.error('Error initializing weather map:', error);
            this.showMapError();
        }
    }

    // Setup map control event listeners
    setupMapControls() {
        const overlaySelect = document.getElementById('overlaySelect');
        const levelSelect = document.getElementById('levelSelect');
        const refreshButton = document.getElementById('refreshMap');

        if (overlaySelect) {
            overlaySelect.addEventListener('change', (e) => {
                this.weatherMap.changeOverlay(e.target.value);
            });
        }

        if (levelSelect) {
            levelSelect.addEventListener('change', (e) => {
                this.weatherMap.changeLevel(parseInt(e.target.value));
            });
        }

        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshWeatherData();
            });
        }
    }

    // Show map error message
    showMapError() {
        const mapContainer = document.getElementById('windyMap');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div class="map-loading">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Unable to load weather map. Please check your internet connection.</span>
                </div>
            `;
        }
    }

    // Initialize event listeners
    initializeEventListeners() {
        // Mobile menu toggle
        const menuToggle = document.querySelector('.menu-toggle');
        const sidebar = document.querySelector('.sidebar');

        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all links
                navLinks.forEach(l => l.parentElement.classList.remove('active'));
                
                // Add active class to clicked link
                link.parentElement.classList.add('active');
                
                // Close mobile menu
                sidebar.classList.remove('open');
            });
        });

        // Forecast period selector
        const forecastSelect = document.getElementById('forecastPeriod');
        if (forecastSelect) {
            forecastSelect.addEventListener('change', (e) => {
                this.updateForecastChart(e.target.value);
            });
        }

        // Refresh buttons
        const refreshForecast = document.getElementById('refreshForecast');
        const refreshAlerts = document.getElementById('refreshAlerts');

        if (refreshForecast) {
            refreshForecast.addEventListener('click', () => {
                this.refreshForecastData();
            });
        }

        if (refreshAlerts) {
            refreshAlerts.addEventListener('click', () => {
                this.refreshWeatherAlerts();
            });
        }
    }

    // Load weather data
    loadWeatherData() {
        this.populateHourlyForecast();
        this.populateWeatherAlerts();
        this.animateWeatherStats();
    }

    // Populate hourly forecast table
    populateHourlyForecast() {
        const tbody = document.getElementById('hourlyForecastBody');
        if (!tbody) return;

        const hourlyData = [
            { time: '00:00', temp: '26°C', wind: '8 km/h NW', humidity: '80%', precip: '0%' },
            { time: '03:00', temp: '25°C', wind: '6 km/h N', humidity: '85%', precip: '10%' },
            { time: '06:00', temp: '24°C', wind: '5 km/h NE', humidity: '90%', precip: '20%' },
            { time: '09:00', temp: '27°C', wind: '8 km/h E', humidity: '75%', precip: '5%' },
            { time: '12:00', temp: '30°C', wind: '12 km/h SE', humidity: '65%', precip: '0%' },
            { time: '15:00', temp: '32°C', wind: '15 km/h S', humidity: '60%', precip: '0%' },
            { time: '18:00', temp: '29°C', wind: '10 km/h SW', humidity: '70%', precip: '15%' },
            { time: '21:00', temp: '28°C', wind: '9 km/h W', humidity: '75%', precip: '5%' }
        ];

        tbody.innerHTML = hourlyData.map(hour => `
            <tr>
                <td>${hour.time}</td>
                <td>${hour.temp}</td>
                <td>${hour.wind}</td>
                <td>${hour.humidity}</td>
                <td>${hour.precip}</td>
            </tr>
        `).join('');
    }

    // Populate weather alerts table
    populateWeatherAlerts() {
        const tbody = document.getElementById('weatherAlertsBody');
        if (!tbody) return;

        const alertsData = [
            { type: 'Heat Advisory', severity: 'moderate', description: 'High temperatures expected', validUntil: '2024-01-20 18:00' },
            { type: 'Wind Warning', severity: 'low', description: 'Moderate winds in coastal areas', validUntil: '2024-01-19 12:00' },
            { type: 'Rain Alert', severity: 'low', description: 'Light rain expected in the evening', validUntil: '2024-01-19 22:00' }
        ];

        tbody.innerHTML = alertsData.map(alert => `
            <tr>
                <td>${alert.type}</td>
                <td><span class="weather-status severity-${alert.severity}">${alert.severity}</span></td>
                <td>${alert.description}</td>
                <td>${new Date(alert.validUntil).toLocaleString()}</td>
            </tr>
        `).join('');
    }

    // Animate weather statistics
    animateWeatherStats() {
        const statValues = document.querySelectorAll('.weather-card .stat-content h3');
        
        statValues.forEach((element) => {
            const targetValue = element.textContent;
            if (!targetValue) return;

            // Extract numeric value
            const numericValue = parseFloat(targetValue.replace(/[^0-9.-]/g, ''));
            if (isNaN(numericValue)) return;

            // Animate the number
            Helpers.animateNumber(element, numericValue, 1000);
        });
    }

    // Update forecast chart based on period
    updateForecastChart(period) {
        if (!this.temperatureChart) return;

        let newData = [];
        let newLabels = [];

        switch (period) {
            case 'Next 24 hours':
                newLabels = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
                newData = [26, 25, 24, 27, 30, 32, 29, 28];
                break;
            case 'Next 7 days':
                newLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                newData = [28, 30, 29, 31, 33, 32, 30];
                break;
            case 'Next 14 days':
                newLabels = ['Week 1', 'Week 2'];
                newData = [29.5, 31.2];
                break;
            default:
                return;
        }

        this.temperatureChart.data.labels = newLabels;
        this.temperatureChart.data.datasets[0].data = newData;
        this.temperatureChart.update();
    }

    // Refresh weather data
    refreshWeatherData() {
        console.log('Refreshing weather data...');
        this.loadWeatherData();
        
        if (this.weatherMap) {
            this.weatherMap.setView(this.currentLocation.lat, this.currentLocation.lon);
        }
    }

    // Refresh forecast data
    refreshForecastData() {
        console.log('Refreshing forecast data...');
        this.populateHourlyForecast();
    }

    // Refresh weather alerts
    refreshWeatherAlerts() {
        console.log('Refreshing weather alerts...');
        this.populateWeatherAlerts();
    }

    // Public methods for external use
    refreshAll() {
        this.refreshWeatherData();
    }

    setLocation(lat, lon) {
        this.currentLocation = { lat, lon };
        if (this.weatherMap) {
            this.weatherMap.setView(lat, lon);
        }
    }
}

// Initialize weather dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const weatherDashboard = new WeatherDashboard();
    window.weatherDashboard = weatherDashboard;
});
