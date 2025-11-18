// Weather Page JavaScript - Handles weather dashboard functionality
class WeatherDashboard {
    constructor() {
        this.weatherData = null;
        this.charts = {};
        this.init();
    }

    init() {
        this.loadWeatherData();
        this.initializeCharts();
        this.setupEventListeners();
        this.initializeWeatherMap();
    }

    loadWeatherData() {
        // Simulate weather data loading
        this.weatherData = {
            current: {
                temperature: 28,
                humidity: 75,
                windSpeed: 12,
                pressure: 1013,
                condition: 'Partly Cloudy',
                icon: 'partly-cloudy'
            },
            forecast: [
                { day: 'Today', high: 30, low: 24, condition: 'Sunny', icon: 'sunny' },
                { day: 'Tomorrow', high: 32, low: 26, condition: 'Hot', icon: 'hot' },
                { day: 'Wednesday', high: 29, low: 23, condition: 'Rainy', icon: 'rainy' },
                { day: 'Thursday', high: 27, low: 22, condition: 'Cloudy', icon: 'cloudy' },
                { day: 'Friday', high: 31, low: 25, condition: 'Sunny', icon: 'sunny' }
            ],
            hourly: [
                { time: '00:00', temp: 26, condition: 'Clear' },
                { time: '03:00', temp: 25, condition: 'Clear' },
                { time: '06:00', temp: 24, condition: 'Foggy' },
                { time: '09:00', temp: 27, condition: 'Sunny' },
                { time: '12:00', temp: 30, condition: 'Sunny' },
                { time: '15:00', temp: 32, condition: 'Hot' },
                { time: '18:00', temp: 29, condition: 'Partly Cloudy' },
                { time: '21:00', temp: 27, condition: 'Clear' }
            ]
        };
        
        this.updateWeatherDisplay();
    }

    updateWeatherDisplay() {
        // Update current weather
        this.updateCurrentWeather();
        
        // Update forecast
        this.updateForecast();
        
        // Update hourly forecast
        this.updateHourlyForecast();
    }

    updateCurrentWeather() {
        const current = this.weatherData.current;
        
        // Update temperature
        const tempElement = document.querySelector('.current-temp');
        if (tempElement) {
            tempElement.textContent = `${current.temperature}°C`;
        }
        
        // Update condition
        const conditionElement = document.querySelector('.current-condition');
        if (conditionElement) {
            conditionElement.textContent = current.condition;
        }
        
        // Update other metrics
        this.updateMetric('.humidity-value', `${current.humidity}%`);
        this.updateMetric('.wind-value', `${current.windSpeed} km/h`);
        this.updateMetric('.pressure-value', `${current.pressure} hPa`);
    }

    updateForecast() {
        const forecastContainer = document.querySelector('.forecast-container');
        if (!forecastContainer) return;

        forecastContainer.innerHTML = this.weatherData.forecast.map(day => `
            <div class="forecast-item">
                <div class="forecast-day">${day.day}</div>
                <div class="forecast-icon">
                    <i class="fas fa-${this.getWeatherIcon(day.icon)}"></i>
                </div>
                <div class="forecast-temps">
                    <span class="forecast-high">${day.high}°</span>
                    <span class="forecast-low">${day.low}°</span>
                </div>
                <div class="forecast-condition">${day.condition}</div>
            </div>
        `).join('');
    }

    updateHourlyForecast() {
        const hourlyContainer = document.querySelector('.hourly-forecast');
        if (!hourlyContainer) return;

        hourlyContainer.innerHTML = this.weatherData.hourly.map(hour => `
            <div class="hourly-item">
                <div class="hourly-time">${hour.time}</div>
                <div class="hourly-temp">${hour.temp}°</div>
                <div class="hourly-condition">${hour.condition}</div>
            </div>
        `).join('');
    }

    updateMetric(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }

    getWeatherIcon(condition) {
        const iconMap = {
            'sunny': 'sun',
            'hot': 'sun',
            'cloudy': 'cloud',
            'partly-cloudy': 'cloud-sun',
            'rainy': 'cloud-rain',
            'foggy': 'smog',
            'clear': 'moon'
        };
        return iconMap[condition] || 'sun';
    }

    initializeCharts() {
        this.createTemperatureChart();
        this.createHumidityChart();
        this.createWindChart();
    }

    createTemperatureChart() {
        const ctx = document.getElementById('temperatureChart');
        if (!ctx) return;

        this.charts.temperature = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.weatherData.hourly.map(h => h.time),
                datasets: [{
                    label: 'Temperature (°C)',
                    data: this.weatherData.hourly.map(h => h.temp),
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    tension: 0.4,
                    fill: true
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
                        title: {
                            display: true,
                            text: 'Temperature (°C)'
                        }
                    }
                }
            }
        });
    }

    createHumidityChart() {
        const ctx = document.getElementById('humidityChart');
        if (!ctx) return;

        this.charts.humidity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.weatherData.hourly.map(h => h.time),
                datasets: [{
                    label: 'Humidity (%)',
                    data: this.weatherData.hourly.map(() => Math.floor(Math.random() * 20) + 70),
                    backgroundColor: 'rgba(78, 205, 196, 0.8)',
                    borderColor: '#4ecdc4',
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
                        max: 100,
                        title: {
                            display: true,
                            text: 'Humidity (%)'
                        }
                    }
                }
            }
        });
    }

    createWindChart() {
        const ctx = document.getElementById('windChart');
        if (!ctx) return;

        this.charts.wind = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.weatherData.hourly.map(h => h.time),
                datasets: [{
                    label: 'Wind Speed (km/h)',
                    data: this.weatherData.hourly.map(() => Math.floor(Math.random() * 15) + 5),
                    borderColor: '#45b7d1',
                    backgroundColor: 'rgba(69, 183, 209, 0.1)',
                    tension: 0.4,
                    fill: true
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
                        title: {
                            display: true,
                            text: 'Wind Speed (km/h)'
                        }
                    }
                }
            }
        });
    }

    initializeWeatherMap() {
        // Initialize weather map if element exists
        const mapElement = document.getElementById('weatherMap');
        if (mapElement && window.boot) {
            // Initialize Windy map
            window.boot('weatherMap', {
                key: 'your-windy-api-key', // Replace with actual API key
                lat: 13.7563,
                lon: 100.5018,
                zoom: 8
            });
        }
    }

    setupEventListeners() {
        // Refresh weather data
        const refreshBtn = document.querySelector('.refresh-weather');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshWeatherData();
            });
        }

        // Location search
        const locationInput = document.querySelector('.location-input');
        if (locationInput) {
            locationInput.addEventListener('change', (e) => {
                this.changeLocation(e.target.value);
            });
        }
    }

    refreshWeatherData() {
        console.log('Refreshing weather data...');
        this.loadWeatherData();
    }

    changeLocation(location) {
        console.log('Changing location to:', location);
        // Implement location change logic
        this.refreshWeatherData();
    }
}

// Initialize weather dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WeatherDashboard();
});
