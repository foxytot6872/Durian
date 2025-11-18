// Navigation Component - Shared across all pages
class NavigationManager {
    constructor() {
        this.navLinks = document.querySelectorAll('.nav-link');
        this.menuToggle = document.querySelector('.menu-toggle');
        this.sidebar = document.querySelector('.sidebar');
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Mobile menu toggle
        if (this.menuToggle && this.sidebar) {
            this.menuToggle.addEventListener('click', () => {
                this.sidebar.classList.toggle('open');
            });
        }

        // Navigation links
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Remove active class from all links
                this.navLinks.forEach(l => l.parentElement.classList.remove('active'));
                
                // Add active class to clicked link
                link.parentElement.classList.add('active');
                
                // Close mobile menu
                if (this.sidebar) {
                    this.sidebar.classList.remove('open');
                }
            });
        });
    }
}

// Export for use in other modules
window.NavigationManager = NavigationManager;
