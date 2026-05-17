(function() {
    const weatherConfig = window.CONFIG?.WEATHER_API || {};
    const API_KEY = weatherConfig.API_KEY || 'c77f6cae2743fcd686c29b44e574e221';
    const CURRENT_ENDPOINT = weatherConfig.ENDPOINTS?.CURRENT || 'https://api.openweathermap.org/data/2.5/weather';
    const FALLBACK_LOCATION = weatherConfig.DEFAULT_LOCATION || { lat: 13.7563, lon: 100.5018 };
    const UNITS = weatherConfig.UNITS || 'metric';

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function getLocation() {
        if (!navigator.geolocation) return Promise.resolve(FALLBACK_LOCATION);

        return new Promise(resolve => {
            navigator.geolocation.getCurrentPosition(
                position => resolve({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                }),
                () => resolve(FALLBACK_LOCATION),
                {
                    enableHighAccuracy: true,
                    timeout: 8000,
                    maximumAge: 5 * 60 * 1000
                }
            );
        });
    }

    function getTemperatureStatus(temp) {
        if (temp >= 36) return 'Hot';
        if (temp >= 30) return 'Warm';
        if (temp >= 24) return 'Ideal';
        return 'Cool';
    }

    async function updateDashboardWeather() {
        try {
            const location = await getLocation();
            const url = `${CURRENT_ENDPOINT}?lat=${location.lat}&lon=${location.lon}&appid=${API_KEY}&units=${UNITS}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`OpenWeather error: ${response.status}`);

            const weather = await response.json();
            const temp = Math.round(weather.main.temp);
            setText('dashboardWeatherTemp', `${temp}°C`);
            setText('dashboardWeatherStatus', getTemperatureStatus(temp));
        } catch (error) {
            console.error('Failed to load dashboard weather:', error);
            setText('dashboardWeatherTemp', 'Error');
            setText('dashboardWeatherStatus', 'Weather unavailable');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        updateDashboardWeather();
        window.setInterval(updateDashboardWeather, 10 * 60 * 1000);
    });
})();
