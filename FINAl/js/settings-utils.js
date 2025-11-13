/**
 * Settings Utilities
 * 
 * Helper functions to apply settings throughout the app
 */

(function () {
    'use strict';

    /**
     * Convert temperature from Celsius to Fahrenheit
     */
    function celsiusToFahrenheit(celsius) {
        return Math.round((celsius * 9/5) + 32);
    }

    /**
     * Format temperature based on user preference
     * @param {number} celsius - Temperature in Celsius
     * @returns {string} Formatted temperature string
     */
    function formatTemperature(celsius) {
        if (typeof window.settingsStore === 'undefined') {
            return `${celsius}°C`;
        }

        const unit = window.settingsStore.get('preferences.temperatureUnit');
        if (unit === 'fahrenheit') {
            const fahrenheit = celsiusToFahrenheit(celsius);
            return `${fahrenheit}°F`;
        }
        return `${celsius}°C`;
    }

    /**
     * Check if notifications should be shown
     * @param {string} type - Notification type ('critical' or 'summary')
     * @returns {boolean}
     */
    function shouldShowNotification(type) {
        if (typeof window.settingsStore === 'undefined') {
            return true; // Default to showing if store not available
        }

        if (type === 'critical') {
            return window.settingsStore.get('notifications.criticalAlertsEmail') !== false;
        }
        if (type === 'summary') {
            return window.settingsStore.get('notifications.summaryNotifications') !== false;
        }
        return true;
    }

    // Export to window
    window.settingsUtils = {
        formatTemperature: formatTemperature,
        shouldShowNotification: shouldShowNotification,
        celsiusToFahrenheit: celsiusToFahrenheit
    };

    // Also export as module if needed
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            formatTemperature,
            shouldShowNotification,
            celsiusToFahrenheit
        };
    }
})();

