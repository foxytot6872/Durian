// Weather Page JavaScript - Live OpenWeather data with OpenWeather map tiles
class WeatherDashboard {
    constructor() {
        const weatherConfig = window.CONFIG?.WEATHER_API || {};
        const endpoints = weatherConfig.ENDPOINTS || {};

        this.apiKey = weatherConfig.API_KEY || 'c77f6cae2743fcd686c29b44e574e221';
        this.currentLocation = { ...(weatherConfig.DEFAULT_LOCATION || { lat: 13.7563, lon: 100.5018 }) };
        this.currentWeatherEndpoint = endpoints.CURRENT || 'https://api.openweathermap.org/data/2.5/weather';
        this.forecastEndpoint = endpoints.FORECAST || 'https://api.openweathermap.org/data/2.5/forecast';
        this.mapTileEndpoint = endpoints.MAP_TILE || 'https://tile.openweathermap.org/map';
        this.units = weatherConfig.UNITS || 'metric';
        this.forecastList = [];
        this.selectedForecastDateKey = null;
        this.currentWeather = null;
        this.currentTimezoneOffset = 0;
        this.map = null;
        this.mapLayers = {};
        this.temperatureChart = null;
        this.windChart = null;
        this.refreshTimer = null;

        this.init();
    }

    async init() {
        this.initializeCharts();
        this.bindControls();
        await this.initializeLocation();
        await this.refreshWeatherData();
        await this.initializeWeatherMap();

        this.refreshTimer = window.setInterval(() => {
            this.refreshWeatherData(true);
        }, 10 * 60 * 1000);
    }

    async initializeLocation() {
        if (!navigator.geolocation) return;

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 8000,
                    maximumAge: 5 * 60 * 1000
                });
            });

            this.currentLocation = {
                lat: position.coords.latitude,
                lon: position.coords.longitude
            };
        } catch (error) {
            console.warn('Using fallback location for weather data:', error);
        }
    }

    async fetchJson(endpoint) {
        const url = `${endpoint}?lat=${this.currentLocation.lat}&lon=${this.currentLocation.lon}&appid=${this.apiKey}&units=${this.units}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }

    showLoadingState() {
        const existingError = document.querySelector('.weather-error');
        if (existingError) {
            existingError.remove();
        }

        ['currentTemp', 'windSpeed', 'humidity', 'visibility'].forEach((id) => {
            const element = document.getElementById(id);
            if (element) element.textContent = 'Loading...';
        });
    }

    showErrorState(message) {
        ['currentTemp', 'windSpeed', 'humidity', 'visibility'].forEach((id) => {
            const element = document.getElementById(id);
            if (element) element.textContent = 'Error';
        });

        const statsGrid = document.querySelector('.stats-grid');
        if (statsGrid && !statsGrid.querySelector('.weather-error')) {
            const error = document.createElement('p');
            error.className = 'weather-error';
            error.style.cssText = 'color:#e74c3c;font-weight:600;margin:0.75rem 0 0;';
            error.textContent = `Could not load weather data: ${message}`;
            statsGrid.appendChild(error);
        }
    }

    async refreshWeatherData(silent = false) {
        this.showLoadingState();

        try {
            const [currentWeather, forecast] = await Promise.all([
                this.fetchJson(this.currentWeatherEndpoint),
                this.fetchJson(this.forecastEndpoint)
            ]);

            this.currentWeather = currentWeather;
            this.forecastList = forecast.list || [];
            this.currentTimezoneOffset = currentWeather.timezone || 0;
            this.ensureSelectedForecastDay();

            this.updateCurrentWeather();
            this.updateTemperatureChart();
            this.updateWindChart();
            this.updateHourlyForecast();
            this.updateWeatherAlerts(currentWeather.alerts || []);
            this.updateForecastDayControls();
            this.updateMapPopup();
            this.updateLastUpdated();
            return true;
        } catch (error) {
            console.error('Failed to refresh weather data:', error);
            if (silent && this.currentWeather) return false;
            this.showErrorState(error.message);
            return false;
        }
    }

    updateCurrentWeather() {
        if (!this.currentWeather) return;

        const tempElement = document.getElementById('currentTemp');
        if (tempElement) tempElement.textContent = `${Math.round(this.currentWeather.main.temp)}°C`;

        const windElement = document.getElementById('windSpeed');
        if (windElement) windElement.textContent = `${Math.round(this.currentWeather.wind.speed * 3.6)} km/h`;

        const humidityElement = document.getElementById('humidity');
        if (humidityElement) humidityElement.textContent = `${this.currentWeather.main.humidity}%`;

        const visibilityElement = document.getElementById('visibility');
        if (visibilityElement) visibilityElement.textContent = `${(this.currentWeather.visibility / 1000).toFixed(1)} km`;

        this.updateWeatherDate();
    }

    updateWeatherDate() {
        const dateElement = document.getElementById('weatherDate');
        if (!dateElement) return;

        const timestamp = this.currentWeather?.dt
            ? (this.currentWeather.dt + this.currentTimezoneOffset) * 1000
            : Date.now();
        dateElement.textContent = new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC'
        }).format(new Date(timestamp));
    }

    updateLastUpdated() {
        const updatedElement = document.getElementById('lastUpdated');
        if (!updatedElement) return;

        updatedElement.textContent = `Last updated: ${new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }).format(new Date())}`;
    }

    initializeCharts() {
        this.createTemperatureChart();
        this.createWindChart();
    }

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
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: { display: true, text: 'Temperature (°C)' }
                    }
                }
            }
        });
    }

    updateTemperatureChart() {
        if (!this.temperatureChart || !this.forecastList.length) return;

        const entries = this.getSelectedDayEntries().slice(0, 8);
        this.temperatureChart.data.labels = entries.map((entry) => this.formatForecastLabel(entry.dt_txt, true));
        this.temperatureChart.data.datasets[0].data = entries.map((entry) => entry.main.temp);
        this.temperatureChart.update();
    }

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
                    borderColor: '#45b7d1',
                    backgroundColor: 'rgba(69, 183, 209, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Wind Speed (km/h)' }
                    }
                }
            }
        });
    }

    updateWindChart() {
        if (!this.windChart || !this.forecastList.length) return;

        const entries = this.getSelectedDayEntries().slice(0, 8);
        this.windChart.data.labels = entries.map((entry) => this.formatForecastLabel(entry.dt_txt, true));
        this.windChart.data.datasets[0].data = entries.map((entry) => parseFloat((entry.wind.speed * 3.6).toFixed(1)));
        this.windChart.update();
    }

    updateHourlyForecast() {
        const tableBody = document.getElementById('hourlyForecastBody');
        if (!tableBody) return;

        if (!this.forecastList.length) {
            tableBody.innerHTML = '<tr><td colspan="5">No forecast data available.</td></tr>';
            return;
        }

        const entries = this.getSelectedDayEntries().slice(0, 8);
        if (!entries.length) {
            tableBody.innerHTML = '<tr><td colspan="5">No forecast data for this day.</td></tr>';
            return;
        }

        tableBody.innerHTML = entries.map((entry) => `
            <tr>
                <td>${this.formatTime(entry.dt_txt)}</td>
                <td>
                    <span class="hourly-condition">
                        <i class="fas ${this.getWeatherIconClass(entry)}"></i>
                        ${this.formatCondition(entry.weather?.[0]?.description)}
                    </span>
                </td>
                <td>${entry.main.temp.toFixed(1)}°C</td>
                <td>${entry.main.humidity}%</td>
                <td>${Math.round((entry.pop || 0) * 100)}%</td>
            </tr>
        `).join('');
    }

    updateWeatherAlerts(alerts) {
        const tableBody = document.getElementById('weatherAlertsBody');
        if (!tableBody) return;

        if (!alerts || !alerts.length) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No active weather alerts</td></tr>';
            return;
        }

        tableBody.innerHTML = alerts.map((alert) => `
            <tr>
                <td>${alert.event}</td>
                <td><span class="weather-status severity-moderate">Alert</span></td>
                <td>${alert.description}</td>
                <td>${new Date(alert.end * 1000).toLocaleString()}</td>
            </tr>
        `).join('');
    }

    async loadLeaflet() {
        if (window.L) return;

        await this.loadStylesheet('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        await this.loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
    }

    loadStylesheet(href) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`link[href="${href}"]`)) {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => resolve();
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async initializeWeatherMap() {
        const mapElement = document.getElementById('windyMap');
        if (!mapElement) return;

        try {
            await this.loadLeaflet();

            if (this.map) {
                this.map.remove();
            }

            this.map = L.map('windyMap').setView([this.currentLocation.lat, this.currentLocation.lon], 6);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);

            this.mapLayers = {
                wind: L.tileLayer(`${this.mapTileEndpoint}/wind_new/{z}/{x}/{y}.png?appid=${this.apiKey}`, {
                    opacity: 0.65,
                    attribution: 'Weather data © OpenWeather'
                }),
                temp: L.tileLayer(`${this.mapTileEndpoint}/temp_new/{z}/{x}/{y}.png?appid=${this.apiKey}`, {
                    opacity: 0.65,
                    attribution: 'Weather data © OpenWeather'
                }),
                pressure: L.tileLayer(`${this.mapTileEndpoint}/pressure_new/{z}/{x}/{y}.png?appid=${this.apiKey}`, {
                    opacity: 0.65,
                    attribution: 'Weather data © OpenWeather'
                }),
                clouds: L.tileLayer(`${this.mapTileEndpoint}/clouds_new/{z}/{x}/{y}.png?appid=${this.apiKey}`, {
                    opacity: 0.65,
                    attribution: 'Weather data © OpenWeather'
                }),
                precip: L.tileLayer(`${this.mapTileEndpoint}/precipitation_new/{z}/{x}/{y}.png?appid=${this.apiKey}`, {
                    opacity: 0.65,
                    attribution: 'Weather data © OpenWeather'
                })
            };

            this.currentOverlay = 'wind';
            this.mapLayers.wind.addTo(this.map);

            if (this.currentWeather) {
                this.addMapMarker();
            }

            this.bindMapControls();
        } catch (error) {
            console.error('Error initializing weather map:', error);
            this.showMapError();
        }
    }

    addMapMarker() {
        if (!this.map || !this.currentWeather) return;

        const description = this.currentWeather.weather?.[0]?.description || 'Live weather';
        L.marker([this.currentLocation.lat, this.currentLocation.lon])
            .addTo(this.map)
            .bindPopup(`
                <div class="weather-popup">
                    <h4>Live weather</h4>
                    <p><strong>Condition:</strong> ${description}</p>
                    <p><strong>Temperature:</strong> ${Math.round(this.currentWeather.main.temp)}°C</p>
                    <p><strong>Wind:</strong> ${Math.round(this.currentWeather.wind.speed * 3.6)} km/h</p>
                    <p><strong>Humidity:</strong> ${this.currentWeather.main.humidity}%</p>
                </div>
            `);
    }

    updateMapPopup() {
        if (!this.map) return;

        this.map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                layer.remove();
            }
        });

        if (this.currentWeather) {
            this.addMapMarker();
        }
    }

    bindMapControls() {
        const overlaySelect = document.getElementById('overlaySelect');
        const levelSelect = document.getElementById('levelSelect');
        const refreshButton = document.getElementById('refreshMap');

        if (overlaySelect) {
            overlaySelect.addEventListener('change', (event) => {
                this.changeOverlay(event.target.value);
            });
        }

        if (levelSelect) {
            levelSelect.addEventListener('change', (event) => {
                this.changeLevel(parseInt(event.target.value, 10));
            });
        }

        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshWeatherData();
            });
        }
    }

    changeOverlay(overlay) {
        if (!this.map || !this.mapLayers[overlay]) return;

        Object.values(this.mapLayers).forEach((layer) => {
            if (this.map.hasLayer(layer)) {
                this.map.removeLayer(layer);
            }
        });

        this.currentOverlay = overlay;
        this.mapLayers[overlay].addTo(this.map);
        this.updateMapPopup();
    }

    changeLevel(level) {
        if (!this.map) return;

        const zoomByLevel = {
            1000: 5,
            925: 6,
            850: 7,
            700: 8,
            500: 9
        };

        if (zoomByLevel[level]) {
            this.map.setZoom(zoomByLevel[level]);
        }
    }

    showMapError() {
        const mapElement = document.getElementById('windyMap');
        if (!mapElement) return;

        mapElement.innerHTML = `
            <div class="map-loading">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Unable to load the OpenWeather map.</span>
            </div>
        `;
    }

    bindControls() {
        const forecastSelect = document.getElementById('forecastPeriod');
        if (forecastSelect) {
            forecastSelect.addEventListener('change', (event) => {
                this.updateForecastChart(event.target.value);
            });
        }

        const forecastPrevDayButton = document.getElementById('forecastPrevDay');
        if (forecastPrevDayButton) {
            forecastPrevDayButton.addEventListener('click', () => {
                this.shiftForecastDay(-1);
            });
        }

        const forecastNextDayButton = document.getElementById('forecastNextDay');
        if (forecastNextDayButton) {
            forecastNextDayButton.addEventListener('click', () => {
                this.shiftForecastDay(1);
            });
        }

    }

    getSelectedDayEntries() {
        if (!this.forecastList.length) return [];

        const selectedKey = this.selectedForecastDateKey || this.getDateKey(this.forecastList[0].dt_txt);
        return this.forecastList.filter((entry) => this.getDateKey(entry.dt_txt) === selectedKey);
    }

    getAvailableForecastDates() {
        return [...new Set(this.forecastList.map((entry) => this.getDateKey(entry.dt_txt)).filter(Boolean))];
    }

    ensureSelectedForecastDay() {
        const dates = this.getAvailableForecastDates();
        if (!dates.length) {
            this.selectedForecastDateKey = null;
            return;
        }

        const todayKey = this.getTodayDateKey();
        if (!this.selectedForecastDateKey) {
            this.selectedForecastDateKey = dates.includes(todayKey) ? todayKey : dates[0];
            return;
        }

        if (!dates.includes(this.selectedForecastDateKey)) {
            this.selectedForecastDateKey = dates.includes(todayKey) ? todayKey : dates[0];
        }
    }

    shiftForecastDay(direction) {
        const dates = this.getAvailableForecastDates();
        if (!dates.length) return;

        const currentIndex = Math.max(0, dates.indexOf(this.selectedForecastDateKey));
        const nextIndex = Math.min(dates.length - 1, Math.max(0, currentIndex + direction));
        this.selectedForecastDateKey = dates[nextIndex];
        this.updateSelectedForecastViews();
    }

    selectTodayForecast() {
        const dates = this.getAvailableForecastDates();
        const todayKey = this.getTodayDateKey();
        this.selectedForecastDateKey = dates.includes(todayKey) ? todayKey : dates[0];
        this.updateSelectedForecastViews();
    }

    updateSelectedForecastViews() {
        this.updateTemperatureChart();
        this.updateWindChart();
        this.updateHourlyForecast();
        this.updateForecastDayControls();
    }

    updateForecastDayControls() {
        const dates = this.getAvailableForecastDates();
        const label = document.getElementById('forecastDayLabel');
        const chartLabel = document.getElementById('chartDayLabel');
        const prevButton = document.getElementById('forecastPrevDay');
        const nextButton = document.getElementById('forecastNextDay');
        const selectedLabel = this.selectedForecastDateKey
            ? this.formatDayLabel(this.selectedForecastDateKey)
            : '--';

        if (label) {
            label.textContent = selectedLabel;
        }

        if (chartLabel) chartLabel.textContent = selectedLabel;

        const selectedIndex = dates.indexOf(this.selectedForecastDateKey);
        if (prevButton) prevButton.disabled = selectedIndex <= 0;
        if (nextButton) nextButton.disabled = selectedIndex === -1 || selectedIndex >= dates.length - 1;
    }

    getDateKey(dtTxt) {
        return dtTxt ? dtTxt.split(' ')[0] : '';
    }

    getTodayDateKey() {
        const timestamp = this.currentWeather?.dt
            ? (this.currentWeather.dt + this.currentTimezoneOffset) * 1000
            : Date.now();
        return new Date(timestamp).toISOString().slice(0, 10);
    }

    formatDayLabel(dateKey) {
        const todayKey = this.getTodayDateKey();
        const [year, month, day] = dateKey.split('-').map(Number);
        const selectedDate = new Date(Date.UTC(year, month - 1, day));
        const todayDate = new Date(`${todayKey}T00:00:00Z`);
        const dayDifference = Math.round((selectedDate - todayDate) / (24 * 60 * 60 * 1000));

        if (dayDifference === 0) return 'Today';

        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric'
        }).format(selectedDate);
    }

    getWeatherIconClass(entry) {
        const conditionId = entry.weather?.[0]?.id || 0;
        const main = (entry.weather?.[0]?.main || '').toLowerCase();

        if (conditionId >= 200 && conditionId < 300) return 'fa-cloud-bolt';
        if (main === 'drizzle' || main === 'rain') return 'fa-cloud-rain';
        if (main === 'snow') return 'fa-snowflake';
        if (conditionId >= 700 && conditionId < 800) return 'fa-smog';
        if (main === 'clear') return 'fa-sun';
        if (main === 'clouds') return 'fa-cloud';
        return 'fa-cloud-sun';
    }

    formatCondition(description) {
        if (!description) return 'Forecast';
        return description.replace(/\b\w/g, (letter) => letter.toUpperCase());
    }

    setAlertRefreshStatus(text) {
        const status = document.getElementById('weatherAlertRefreshStatus');
        if (status) status.textContent = text;
    }

    formatClock(date) {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        }).format(date);
    }

    updateForecastChart(period) {
        if (!this.temperatureChart || !this.forecastList.length) return;

        let entries = this.forecastList.slice(0, 8);
        if (period === 'Next 7 days') {
            entries = this.forecastList.filter((_, index) => index % 8 === 0).slice(0, 7);
        } else if (period === 'Next 14 days') {
            entries = this.forecastList.filter((_, index) => index % 8 === 0).slice(0, 14);
        }

        this.temperatureChart.data.labels = entries.map((entry) => this.formatForecastLabel(entry.dt_txt, period !== 'Next 24 hours'));
        this.temperatureChart.data.datasets[0].data = entries.map((entry) => entry.main.temp);
        this.temperatureChart.update();
    }

    formatTime(dtTxt) {
        if (!dtTxt) return '';
        const parts = dtTxt.split(' ');
        return parts[1] ? parts[1].substring(0, 5) : dtTxt;
    }

    formatForecastLabel(dtTxt, includeDate = false) {
        if (!dtTxt) return '';

        const [datePart, timePart] = dtTxt.split(' ');
        const time = timePart ? timePart.substring(0, 5) : '';

        if (!includeDate) {
            return time;
        }

        const [year, month, day] = datePart.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dateLabel = new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric'
        }).format(date);

        return `${dateLabel} ${time}`.trim();
    }

    degreesToCompass(deg) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(((deg % 360) / 45)) % 8;
        return directions[index];
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.weatherDashboard = new WeatherDashboard();
});
