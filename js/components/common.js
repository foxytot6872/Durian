// Common Component - Shared utilities and common functionality
class CommonUtils {
    constructor() {
        this.init();
    }

    init() {
        this.setupCommonEventListeners();
        this.initializeCommonFeatures();
    }

    setupCommonEventListeners() {
        // Search functionality
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) {
            const debouncedSearch = this.debounce((query) => {
                this.handleSearch(query);
            }, 300);
            
            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });
        }

        // Notification bell
        const notificationBell = document.querySelector('.notifications');
        if (notificationBell) {
            notificationBell.addEventListener('click', () => {
                this.showNotifications();
            });
        }

        // User profile dropdown
        const userProfile = document.querySelector('.user-profile');
        if (userProfile) {
            userProfile.addEventListener('click', () => {
                this.toggleUserMenu();
            });
        }
    }

    initializeCommonFeatures() {
        // Initialize tooltips
        this.initTooltips();
        
        // Initialize loading states
        this.initLoadingStates();
    }

    // Debounce function for search
    debounce(func, wait) {
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

    // Handle search functionality
    handleSearch(query) {
        console.log('Searching for:', query);
        // This will be overridden by individual page implementations
    }

    // Show notifications
    showNotifications() {
        console.log('Showing notifications');
        // Implement notification dropdown
    }

    // Toggle user menu
    toggleUserMenu() {
        console.log('Toggling user menu');
        // Implement user menu dropdown
    }

    // Initialize tooltips
    initTooltips() {
        // Add tooltip functionality if needed
    }

    // Initialize loading states
    initLoadingStates() {
        // Add loading state management
    }

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    // Format number
    formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(num);
    }

    // Format percentage
    formatPercentage(num) {
        return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
    }

    // Show loading spinner
    showLoading(element) {
        if (element) {
            element.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        }
    }

    // Hide loading spinner
    hideLoading(element, content) {
        if (element) {
            element.innerHTML = content;
        }
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Export for use in other modules
window.CommonUtils = CommonUtils;
