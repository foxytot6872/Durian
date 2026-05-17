(function() {
    const weatherConfig = window.CONFIG?.WEATHER_API || {};
    const API_KEY = weatherConfig.API_KEY || 'c77f6cae2743fcd686c29b44e574e221';
    const CURRENT_ENDPOINT = weatherConfig.ENDPOINTS?.CURRENT || 'https://api.openweathermap.org/data/2.5/weather';
    const FORECAST_ENDPOINT = weatherConfig.ENDPOINTS?.FORECAST || 'https://api.openweathermap.org/data/2.5/forecast';
    const FALLBACK_LOCATION = weatherConfig.DEFAULT_LOCATION || { lat: 13.7563, lon: 100.5018 };
    const UNITS = weatherConfig.UNITS || 'metric';

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function setUpdated(text) {
        const element = document.querySelector('.weather-update');
        if (element) element.textContent = text;
    }

    async function getLocation() {
        if (!navigator.geolocation) return FALLBACK_LOCATION;

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 8000,
                    maximumAge: 5 * 60 * 1000
                });
            });

            return {
                lat: position.coords.latitude,
                lon: position.coords.longitude
            };
        } catch (error) {
            console.warn('Using fallback location for recommendation weather:', error);
            return FALLBACK_LOCATION;
        }
    }

    async function fetchWeather(endpoint, location) {
        const url = `${endpoint}?lat=${location.lat}&lon=${location.lon}&appid=${API_KEY}&units=${UNITS}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`OpenWeather error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }

    function getRainChance(currentWeather, forecast) {
        const forecastPop = forecast?.list?.[0]?.pop;
        if (Number.isFinite(forecastPop)) {
            return Math.round(forecastPop * 100);
        }

        const currentRain = currentWeather?.rain?.['1h'] || currentWeather?.rain?.['3h'];
        if (currentRain) {
            return Math.round(Math.min(100, currentRain * 12));
        }

        return 0;
    }

    function publishWeatherData(currentWeather, forecast, location) {
        const rainChance = getRainChance(currentWeather, forecast);
        const condition = currentWeather.weather?.[0]?.main || 'Unknown';
        const description = currentWeather.weather?.[0]?.description || 'current weather';

        window.DurianWeatherData = {
            current: currentWeather,
            forecast,
            location,
            updatedAt: new Date().toISOString(),
            summary: {
                temperature: currentWeather.main.temp,
                humidity: currentWeather.main.humidity,
                windKmh: currentWeather.wind.speed * 3.6,
                rainChance,
                condition,
                description
            }
        };

        window.dispatchEvent(new CustomEvent('durian-weather-updated', {
            detail: window.DurianWeatherData
        }));
    }

    function renderWeather(currentWeather, forecast, location) {
        const rainChance = getRainChance(currentWeather, forecast);
        setText('recommendationWeatherTemp', `${Math.round(currentWeather.main.temp)}°C`);
        setText('recommendationWeatherHumidity', `${currentWeather.main.humidity}%`);
        setText('recommendationWeatherWind', `${Math.round(currentWeather.wind.speed * 3.6)} km/h`);
        setText('recommendationWeatherRain', `${rainChance}%`);
        publishWeatherData(currentWeather, forecast, location);

        const updated = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        }).format(new Date());
        setUpdated(`Updated ${updated}`);
    }

    async function updateRecommendationWeather() {
        setUpdated('Updating weather...');

        try {
            const location = await getLocation();
            const [currentWeather, forecast] = await Promise.all([
                fetchWeather(CURRENT_ENDPOINT, location),
                fetchWeather(FORECAST_ENDPOINT, location)
            ]);
            renderWeather(currentWeather, forecast, location);
        } catch (error) {
            console.error('Failed to load recommendation weather:', error);
            setText('recommendationWeatherTemp', 'Error');
            setText('recommendationWeatherHumidity', 'Error');
            setText('recommendationWeatherWind', 'Error');
            setText('recommendationWeatherRain', 'Error');
            setUpdated('Weather unavailable');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        updateRecommendationWeather();
        window.setInterval(updateRecommendationWeather, 10 * 60 * 1000);
    });
})();
