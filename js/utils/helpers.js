// Helper utility functions
class Helpers {
    // Format currency values
    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    // Format numbers with commas
    static formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(num);
    }

    // Format percentage values
    static formatPercentage(num) {
        return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
    }

    // Animate number counting
    static animateNumber(element, targetValue, duration = 1000) {
        const startValue = 0;
        const increment = targetValue / (duration / 16); // 60fps
        let currentValue = startValue;

        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(timer);
            }

            // Format based on original content
            const originalText = element.textContent;
            if (originalText.includes('$')) {
                element.textContent = `$${Math.floor(currentValue).toLocaleString()}`;
            } else if (originalText.includes('%')) {
                element.textContent = `${currentValue.toFixed(1)}%`;
            } else {
                element.textContent = Math.floor(currentValue).toLocaleString();
            }
        }, 16);
    }

    // Debounce function for search
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Generate random ID
    static generateId(prefix = 'id') {
        return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Check if element is in viewport
    static isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    // Local storage helpers
    static setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('LocalStorage not available');
        }
    }

    static getStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn('LocalStorage not available');
            return defaultValue;
        }
    }
}

// Export for use in other modules
window.Helpers = Helpers;
