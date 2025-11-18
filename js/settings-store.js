/**
 * Settings Store - Centralized settings management
 * 
 * This store handles all user settings with localStorage persistence.
 * Settings structure:
 * {
 *   profile: {
 *     name: string,
 *     displayName: string (optional)
 *   },
 *   notifications: {
 *     criticalAlertsEmail: boolean,
 *     summaryNotifications: boolean
 *   },
 *   preferences: {
 *     temperatureUnit: "celsius" | "fahrenheit",
 *     language: "en" | "th"
 *   }
 * }
 */

(function () {
    'use strict';

    const SETTINGS_KEY = 'farmDashboardSettings';

    // Default settings
    const defaultSettings = {
        profile: {
            name: '',
            displayName: ''
        },
        notifications: {
            criticalAlertsEmail: true,
            summaryNotifications: true
        },
        preferences: {
            temperatureUnit: 'celsius',
            language: 'en'
        }
    };

    /**
     * Settings Store Object
     */
    const settingsStore = {
        _settings: null,
        _listeners: [],

        /**
         * Initialize settings from localStorage
         */
        init: function () {
            try {
                const stored = localStorage.getItem(SETTINGS_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    // Merge with defaults to ensure all keys exist
                    this._settings = {
                        profile: { ...defaultSettings.profile, ...(parsed.profile || {}) },
                        notifications: { ...defaultSettings.notifications, ...(parsed.notifications || {}) },
                        preferences: { ...defaultSettings.preferences, ...(parsed.preferences || {}) }
                    };
                } else {
                    this._settings = JSON.parse(JSON.stringify(defaultSettings));
                }
            } catch (e) {
                console.error('Error loading settings:', e);
                this._settings = JSON.parse(JSON.stringify(defaultSettings));
            }
        },

        /**
         * Get all settings
         */
        getSettings: function () {
            if (!this._settings) {
                this.init();
            }
            return JSON.parse(JSON.stringify(this._settings));
        },

        /**
         * Get a specific setting path (e.g., 'notifications.criticalAlertsEmail')
         */
        get: function (path) {
            if (!this._settings) {
                this.init();
            }
            const keys = path.split('.');
            let value = this._settings;
            for (const key of keys) {
                if (value && typeof value === 'object' && key in value) {
                    value = value[key];
                } else {
                    return undefined;
                }
            }
            return value;
        },

        /**
         * Update settings
         * @param {Object} updates - Partial settings object to merge
         */
        update: function (updates) {
            if (!this._settings) {
                this.init();
            }
            
            // Deep merge updates
            this._settings = {
                profile: { ...this._settings.profile, ...(updates.profile || {}) },
                notifications: { ...this._settings.notifications, ...(updates.notifications || {}) },
                preferences: { ...this._settings.preferences, ...(updates.preferences || {}) }
            };

            // Persist to localStorage
            this._persist();

            // Notify listeners
            this._notifyListeners();
        },

        /**
         * Update a specific setting path
         * @param {string} path - Dot-separated path (e.g., 'notifications.criticalAlertsEmail')
         * @param {*} value - New value
         */
        set: function (path, value) {
            if (!this._settings) {
                this.init();
            }

            const keys = path.split('.');
            const lastKey = keys.pop();
            let target = this._settings;

            for (const key of keys) {
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                target = target[key];
            }

            target[lastKey] = value;
            this._persist();
            this._notifyListeners();
        },

        /**
         * Persist settings to localStorage
         */
        _persist: function () {
            try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(this._settings));
            } catch (e) {
                console.error('Error saving settings:', e);
            }
        },

        /**
         * Subscribe to settings changes
         * @param {Function} callback - Function to call when settings change
         * @returns {Function} Unsubscribe function
         */
        subscribe: function (callback) {
            this._listeners.push(callback);
            return () => {
                this._listeners = this._listeners.filter(cb => cb !== callback);
            };
        },

        /**
         * Notify all listeners of settings changes
         */
        _notifyListeners: function () {
            this._listeners.forEach(callback => {
                try {
                    callback(this.getSettings());
                } catch (e) {
                    console.error('Error in settings listener:', e);
                }
            });
        },

        /**
         * Reset to default settings
         */
        reset: function () {
            this._settings = JSON.parse(JSON.stringify(defaultSettings));
            this._persist();
            this._notifyListeners();
        }
    };

    // Initialize on load
    settingsStore.init();

    // Export to window for global access
    window.settingsStore = settingsStore;

    // Also export as module if needed
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = settingsStore;
    }
})();

