// Weather Dashboard Application
class WeatherDashboard {
    constructor() {
        this.weatherMap = null;
        this.temperatureChart = null;
        this.windChart = null;
        this.currentLocation = { lat: 13.7563, lon: 100.5018 }; // Bangkok, Thailand
        this.apiKey = 'c77f6cae2743fcd686c29b44e574e221';
        this.apiEndpoint = 'https://api.openweathermap.org/data/2.5/forecast';
        this.forecastList = []; // Cached forecast entries from API
<<<<<<< HEAD
        this.hourlyDayOffset = 0; // 0 = today, 1 = tomorrow, etc.
        this.uniqueDays = []; // list of YYYY-MM-DD strings present in forecastList
=======
>>>>>>> 59d2010 (have postman)

        this.init();
    }

    // Initialize the weather dashboard
    async init() {
        this.initializeCharts();
        this.initializeEventListeners();
        await this.fetchAndRender();

        // Initialize Windy map after a short delay to ensure API is loaded
        setTimeout(() => {
            this.initializeWeatherMap();
        }, 1000);
    }

    // ─── API Fetch ────────────────────────────────────────────────────────────

    // Fetch live forecast data from OpenWeatherMap and render all sections
    async fetchAndRender() {
        this.showLoadingState();
        try {
            const url = `${this.apiEndpoint}?lat=${this.currentLocation.lat}&lon=${this.currentLocation.lon}&appid=${this.apiKey}&units=metric`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            this.forecastList = data.list || [];
<<<<<<< HEAD

            // Build unique date list (YYYY-MM-DD) for day navigation
            this.uniqueDays = Array.from(new Set(this.forecastList.map(e => e.dt_txt ? e.dt_txt.split(' ')[0] : ''))).filter(Boolean);
            if (this.uniqueDays.length === 0) {
                // Fallback: keep using first 5 days by slicing timestamps
                this.uniqueDays = this.forecastList.slice(0, 40).map(e => e.dt_txt ? e.dt_txt.split(' ')[0] : '').filter(Boolean);
                this.uniqueDays = Array.from(new Set(this.uniqueDays));
            }

            // Reset offset if out of range
            if (this.hourlyDayOffset >= this.uniqueDays.length) this.hourlyDayOffset = Math.max(0, this.uniqueDays.length - 1);

            this.renderStatCards(this.forecastList);
            this.updateTemperatureChart(this.forecastList);
            this.updateWindChart(this.forecastList);
            this.populateHourlyForecast(this.forecastList, this.hourlyDayOffset);
            this.populateWeatherAlerts([]);
            this.updateForecastDayControls();
=======
            this.renderStatCards(this.forecastList);
            this.updateTemperatureChart(this.forecastList);
            this.updateWindChart(this.forecastList);
            this.populateHourlyForecast(this.forecastList);
            this.populateWeatherAlerts([]);
>>>>>>> 59d2010 (have postman)
        } catch (error) {
            console.error('Failed to fetch weather data:', error);
            this.showErrorState(error.message);
        }
    }

    // ─── Loading / Error States ───────────────────────────────────────────────

    showLoadingState() {
        const ids = ['currentTemp', 'windSpeed', 'humidity', 'visibility'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = 'Loading...';
        });
    }

    showErrorState(message) {
        const ids = ['currentTemp', 'windSpeed', 'humidity', 'visibility'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = 'Error';
        });
        // Show a visible error banner if a suitable container exists
        const statsArea = document.querySelector('.weather-stats, .stat-cards, .stats-grid');
        if (statsArea) {
            const banner = document.createElement('p');
            banner.style.cssText = 'color:#e74c3c;font-weight:bold;margin-top:8px;';
            banner.textContent = `Could not load weather data: ${message}`;
            statsArea.appendChild(banner);
        }
    }

    // ─── Stat Cards ───────────────────────────────────────────────────────────

    renderStatCards(list) {
        if (!list || list.length === 0) return;
        const current = list[0];

        const tempEl = document.getElementById('currentTemp');
        if (tempEl) tempEl.textContent = `${current.main.temp.toFixed(1)}°C`;

        const windEl = document.getElementById('windSpeed');
        if (windEl) windEl.textContent = `${(current.wind.speed * 3.6).toFixed(1)} km/h`;

        const humidityEl = document.getElementById('humidity');
        if (humidityEl) humidityEl.textContent = `${current.main.humidity}%`;

        const visibilityEl = document.getElementById('visibility');
        if (visibilityEl) visibilityEl.textContent = `${(current.visibility / 1000).toFixed(1)} km`;
    }

    // ─── Charts ───────────────────────────────────────────────────────────────

    // Initialize weather charts with empty placeholders
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
                labels: [],
                datasets: [{
                    label: 'Temperature (°C)',
                    data: [],
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
                            callback: function (value) {
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

    // Update temperature chart with live API data
    updateTemperatureChart(list) {
        if (!this.temperatureChart || !list || list.length === 0) return;
        const entries = list.slice(0, 8);
        this.temperatureChart.data.labels = entries.map(e => this.formatTime(e.dt_txt));
        this.temperatureChart.data.datasets[0].data = entries.map(e => e.main.temp);
        this.temperatureChart.update();
    }

    // Create wind speed chart
    createWindChart() {
        const ctx = document.getElementById('windChart');
        if (!ctx) return;

        this.windChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Wind Speed (km/h)',
                    data: [],
                    borderColor: 'rgb(79, 172, 254)',
                    backgroundColor: 'rgba(79, 172, 254, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgb(79, 172, 254)',
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
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function (value) {
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

    // Update wind chart with live API data
    updateWindChart(list) {
        if (!this.windChart || !list || list.length === 0) return;
        const entries = list.slice(0, 8);
        this.windChart.data.labels = entries.map(e => this.formatTime(e.dt_txt));
        this.windChart.data.datasets[0].data = entries.map(e => parseFloat((e.wind.speed * 3.6).toFixed(1)));
        this.windChart.update();
    }

    // ─── Windy Map ────────────────────────────────────────────────────────────

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

    // ─── Event Listeners ──────────────────────────────────────────────────────

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
                if (sidebar) sidebar.classList.remove('open');
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

        // Hour navigation controls (Today / Prev / Next)
        const prevBtn = document.getElementById('forecastPrevDay');
        const todayBtn = document.getElementById('forecastToday');
        const nextBtn = document.getElementById('forecastNextDay');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.hourlyDayOffset > 0) this.hourlyDayOffset--;
                this.populateHourlyForecast(this.forecastList, this.hourlyDayOffset);
                this.updateForecastDayControls();
            });
        }

        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                this.hourlyDayOffset = 0;
                this.populateHourlyForecast(this.forecastList, this.hourlyDayOffset);
                this.updateForecastDayControls();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.uniqueDays && this.hourlyDayOffset < this.uniqueDays.length - 1) this.hourlyDayOffset++;
                this.populateHourlyForecast(this.forecastList, this.hourlyDayOffset);
                this.updateForecastDayControls();
            });
        }
    }

    // ─── Hourly Forecast Table ────────────────────────────────────────────────

    populateHourlyForecast(list) {
        const tbody = document.getElementById('hourlyForecastBody');
        if (!tbody) return;

        if (!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No forecast data available.</td></tr>';
            return;
        }

        const entries = list.slice(0, 8);
        tbody.innerHTML = entries.map(entry => {
            const time = this.formatTime(entry.dt_txt);
            const temp = `${entry.main.temp.toFixed(1)}°C`;
            const windKmh = (entry.wind.speed * 3.6).toFixed(1);
            const windDir = this.degreesToCompass(entry.wind.deg);
            const wind = `${windKmh} km/h ${windDir}`;
            const humidity = `${entry.main.humidity}%`;
            const precip = `${Math.round((entry.pop || 0) * 100)}%`;
            return `
            <tr>
                <td>${time}</td>
                <td>${temp}</td>
                <td>${wind}</td>
                <td>${humidity}</td>
                <td>${precip}</td>
            </tr>`;
        }).join('');
    }

    // ─── Weather Alerts Table ─────────────────────────────────────────────────

    populateWeatherAlerts(alerts) {
        const tbody = document.getElementById('weatherAlertsBody');
        if (!tbody) return;

        if (!alerts || alerts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No active weather alerts</td></tr>';
            return;
        }

        tbody.innerHTML = alerts.map(alert => `
            <tr>
                <td>${alert.event}</td>
                <td><span class="weather-status severity-moderate">Alert</span></td>
                <td>${alert.description}</td>
                <td>${new Date(alert.end * 1000).toLocaleString()}</td>
            </tr>
        `).join('');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    // Format "2026-05-16 12:00:00" -> "12:00"
    formatTime(dtTxt) {
        if (!dtTxt) return '';
        const parts = dtTxt.split(' ');
        return parts[1] ? parts[1].substring(0, 5) : dtTxt;
    }

    // Convert wind degrees to compass direction
    degreesToCompass(deg) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(((deg % 360) / 45)) % 8;
        return directions[index];
    }

    // ─── Chart Period Selector ────────────────────────────────────────────────

    // Update forecast chart based on period selector (uses cached API data when available)
    updateForecastChart(period) {
        if (!this.temperatureChart) return;

        if (this.forecastList && this.forecastList.length > 0) {
            let entries;
            switch (period) {
                case 'Next 24 hours':
                    entries = this.forecastList.slice(0, 8);
                    break;
                case 'Next 7 days':
                    // One entry per day (every 8th entry = 24h apart)
                    entries = this.forecastList.filter((_, i) => i % 8 === 0).slice(0, 7);
                    break;
                case 'Next 14 days':
                    entries = this.forecastList.filter((_, i) => i % 8 === 0);
                    break;
                default:
                    entries = this.forecastList.slice(0, 8);
            }
            this.temperatureChart.data.labels = entries.map(e => {
                if (period === 'Next 24 hours') return this.formatTime(e.dt_txt);
                // For multi-day, show date portion
                return e.dt_txt ? e.dt_txt.split(' ')[0].substring(5) : '';
            });
            this.temperatureChart.data.datasets[0].data = entries.map(e => e.main.temp);
            this.temperatureChart.update();
        }
    }

    // ─── Refresh Methods ──────────────────────────────────────────────────────

    // Refresh all weather data (re-fetches from API)
    async refreshWeatherData() {
        console.log('Refreshing weather data...');
        await this.fetchAndRender();

        if (this.weatherMap) {
            this.weatherMap.setView(this.currentLocation.lat, this.currentLocation.lon);
        }
    }

    // Refresh forecast section only
    async refreshForecastData() {
        console.log('Refreshing forecast data...');
        await this.fetchAndRender();
    }

    // Refresh alerts section only
    async refreshWeatherAlerts() {
        console.log('Refreshing weather alerts...');
        // The 5-day forecast API does not return alerts; re-render with empty list
        this.populateWeatherAlerts([]);
    }

    // ─── Public API ───────────────────────────────────────────────────────────

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