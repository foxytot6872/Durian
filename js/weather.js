// Weather Page JavaScript - Handles weather dashboard functionality
class WeatherDashboard {
    constructor() {
<<<<<<< Updated upstream
        this.weatherData = null;
        this.charts = {};
=======
        this.apiKey = 'c77f6cae2743fcd686c29b44e574e221';
        this.currentLocation = { lat: 13.7563, lon: 100.5018 };
        this.currentWeatherEndpoint = 'https://api.openweathermap.org/data/2.5/weather';
        this.forecastEndpoint = 'https://api.openweathermap.org/data/2.5/forecast';
        this.forecastList = [];
        this.currentWeather = null;
        this.currentTimezoneOffset = 0;
        this.map = null;
        this.mapLayers = {};
        this.temperatureChart = null;
        this.windChart = null;
        this.refreshTimer = null;
        this.selectedForecastDateKey = null;

>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
    updateWeatherDisplay() {
        // Update current weather
        this.updateCurrentWeather();
        
        // Update forecast
        this.updateForecast();
        
        // Update hourly forecast
        this.updateHourlyForecast();
=======
    async fetchJson(endpoint) {
        const url = `${endpoint}?lat=${this.currentLocation.lat}&lon=${this.currentLocation.lon}&appid=${this.apiKey}&units=metric`;
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
            this.updateForecastDayControls();
            this.updateWeatherAlerts(currentWeather.alerts || [], true);
            this.updateMapPopup();
            this.updateLastUpdated();
        } catch (error) {
            console.error('Failed to refresh weather data:', error);
            if (silent && this.currentWeather) return;
            this.showErrorState(error.message);
        }
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
        const entries = this.getSelectedDayEntries().slice(0, 8);
        this.temperatureChart.data.labels = entries.map((entry) => this.formatForecastLabel(entry.dt_txt, true));
        this.temperatureChart.data.datasets[0].data = entries.map((entry) => entry.main.temp);
        this.temperatureChart.update();
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
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
            tableBody.innerHTML = '<tr><td colspan="6">No forecast data available.</td></tr>';
            return;
        }

        const entries = this.getSelectedDayEntries();
        if (!entries.length) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hourly forecast available for this day.</td></tr>';
            return;
        }

        tableBody.innerHTML = entries.map((entry) => {
            const condition = entry.weather?.[0] || {};
            const icon = this.getWeatherIcon(condition.id, condition.icon);
            const description = condition.description || 'Forecast';
            return `
            <tr>
                <td>${this.formatTime(entry.dt_txt)}</td>
                <td>
                    <span class="hourly-condition">
                        <i class="${icon}"></i>
                        <span>${description}</span>
                    </span>
                </td>
                <td>${entry.main.temp.toFixed(1)}°C</td>
                <td>${Math.round(entry.wind.speed * 3.6)} km/h ${this.degreesToCompass(entry.wind.deg)}</td>
                <td>${entry.main.humidity}%</td>
                <td>${Math.round((entry.pop || 0) * 100)}%</td>
            </tr>
        `;
        }).join('');
    }

    updateWeatherAlerts(alerts, showTimestamp = false) {
        const tableBody = document.getElementById('weatherAlertsBody');
        if (!tableBody) return;

        if (!alerts || !alerts.length) {
            const checkedText = showTimestamp ? ` Checked ${this.formatCheckedTime(new Date())}.` : '';
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No active weather alerts.${checkedText}</td></tr>`;
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
                wind: L.tileLayer(`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${this.apiKey}`, {
                    opacity: 0.65,
                    attribution: 'Weather data © OpenWeather'
                }),
                temp: L.tileLayer(`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${this.apiKey}`, {
                    opacity: 0.65,
                    attribution: 'Weather data © OpenWeather'
                }),
                pressure: L.tileLayer(`https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${this.apiKey}`, {
                    opacity: 0.65,
                    attribution: 'Weather data © OpenWeather'
                }),
                clouds: L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${this.apiKey}`, {
                    opacity: 0.65,
                    attribution: 'Weather data © OpenWeather'
                }),
                precip: L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${this.apiKey}`, {
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
>>>>>>> Stashed changes
            });
        }
    }

<<<<<<< Updated upstream
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
=======
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

        const refreshAlertsButton = document.getElementById('refreshAlerts');
        if (refreshAlertsButton) {
            refreshAlertsButton.addEventListener('click', async () => {
                const previousText = refreshAlertsButton.textContent;
                refreshAlertsButton.disabled = true;
                refreshAlertsButton.textContent = 'Checking...';

                try {
                    await this.refreshWeatherData();
                    this.updateWeatherAlerts(this.currentWeather?.alerts || [], true);
                } finally {
                    refreshAlertsButton.disabled = false;
                    refreshAlertsButton.textContent = previousText;
                }
            });
        }

        const prevDayButton = document.getElementById('forecastPrevDay');
        const nextDayButton = document.getElementById('forecastNextDay');
        const todayButton = document.getElementById('forecastToday');
        const dayLabelButton = document.getElementById('forecastDayLabel');

        if (prevDayButton) {
            prevDayButton.addEventListener('click', () => this.changeForecastDay(-1));
        }

        if (nextDayButton) {
            nextDayButton.addEventListener('click', () => this.changeForecastDay(1));
        }

        if (todayButton) {
            todayButton.addEventListener('click', () => this.selectTodayForecast());
        }

        if (dayLabelButton) {
            dayLabelButton.addEventListener('click', () => this.changeForecastDay(1));
>>>>>>> Stashed changes
        }
    }

    refreshWeatherData() {
        console.log('Refreshing weather data...');
        this.loadWeatherData();
    }

<<<<<<< Updated upstream
    changeLocation(location) {
        console.log('Changing location to:', location);
        // Implement location change logic
        this.refreshWeatherData();
=======
    getDateKey(dtTxt) {
        return dtTxt ? dtTxt.split(' ')[0] : '';
    }

    getAvailableForecastDateKeys() {
        return Array.from(new Set(this.forecastList.map((entry) => this.getDateKey(entry.dt_txt)).filter(Boolean)));
    }

    getTodayKey() {
        if (!this.currentWeather?.dt) {
            return this.getDateKey(this.forecastList[0]?.dt_txt);
        }

        const timestamp = (this.currentWeather.dt + this.currentTimezoneOffset) * 1000;
        const date = new Date(timestamp);
        return [
            date.getUTCFullYear(),
            String(date.getUTCMonth() + 1).padStart(2, '0'),
            String(date.getUTCDate()).padStart(2, '0')
        ].join('-');
    }

    ensureSelectedForecastDay() {
        const availableDates = this.getAvailableForecastDateKeys();
        if (!availableDates.length) return;

        const todayKey = this.getTodayKey();
        if (!this.selectedForecastDateKey || !availableDates.includes(this.selectedForecastDateKey)) {
            this.selectedForecastDateKey = availableDates.includes(todayKey) ? todayKey : availableDates[0];
        }
    }

    getSelectedDayEntries() {
        this.ensureSelectedForecastDay();
        return this.forecastList.filter((entry) => this.getDateKey(entry.dt_txt) === this.selectedForecastDateKey);
    }

    changeForecastDay(direction) {
        const availableDates = this.getAvailableForecastDateKeys();
        if (!availableDates.length) return;

        this.ensureSelectedForecastDay();
        const currentIndex = availableDates.indexOf(this.selectedForecastDateKey);
        const nextIndex = Math.min(availableDates.length - 1, Math.max(0, currentIndex + direction));
        this.selectedForecastDateKey = availableDates[nextIndex];
        this.updateSelectedForecastDay();
    }

    selectTodayForecast() {
        const availableDates = this.getAvailableForecastDateKeys();
        const todayKey = this.getTodayKey();
        this.selectedForecastDateKey = availableDates.includes(todayKey) ? todayKey : availableDates[0];
        this.updateSelectedForecastDay();
    }

    updateSelectedForecastDay() {
        this.updateTemperatureChart();
        this.updateWindChart();
        this.updateHourlyForecast();
        this.updateForecastDayControls();
    }

    updateForecastDayControls() {
        const availableDates = this.getAvailableForecastDateKeys();
        const label = document.getElementById('forecastDayLabel');
        const prevButton = document.getElementById('forecastPrevDay');
        const nextButton = document.getElementById('forecastNextDay');
        const todayButton = document.getElementById('forecastToday');

        if (!availableDates.length) {
            if (label) label.textContent = '--';
            return;
        }

        this.ensureSelectedForecastDay();
        const currentIndex = availableDates.indexOf(this.selectedForecastDateKey);
        const todayKey = this.getTodayKey();
        const dateLabel = this.formatDateLabel(this.selectedForecastDateKey);

        if (label) {
            label.textContent = this.selectedForecastDateKey === todayKey ? 'Today' : dateLabel;
            label.title = 'Click to go to next forecast day';
        }
        if (prevButton) prevButton.disabled = currentIndex <= 0;
        if (nextButton) nextButton.disabled = currentIndex >= availableDates.length - 1;
        if (todayButton) todayButton.disabled = this.selectedForecastDateKey === todayKey;
    }

    formatDateLabel(dateKey) {
        if (!dateKey) return '--';
        const [year, month, day] = dateKey.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric'
        }).format(date);
    }

    formatCheckedTime(date) {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        }).format(date);
    }

    getWeatherIcon(conditionId, iconCode) {
        if (conditionId >= 200 && conditionId < 300) return 'fas fa-cloud-bolt';
        if (conditionId >= 300 && conditionId < 600) return 'fas fa-cloud-rain';
        if (conditionId >= 600 && conditionId < 700) return 'fas fa-snowflake';
        if (conditionId >= 700 && conditionId < 800) return 'fas fa-smog';
        if (conditionId === 800) return iconCode && iconCode.includes('n') ? 'fas fa-moon' : 'fas fa-sun';
        if (conditionId === 801) return iconCode && iconCode.includes('n') ? 'fas fa-cloud-moon' : 'fas fa-cloud-sun';
        if (conditionId > 801) return 'fas fa-cloud';
        return 'fas fa-cloud-sun';
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
>>>>>>> Stashed changes
    }
}

// Initialize weather dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WeatherDashboard();
});
