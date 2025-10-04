// Dashboard Main Page TypeScript

// Interface definitions
interface NavigationLink {
    href: string;
    text: string;
    isActive: boolean;
}

interface ChartData {
    labels: string[];
    datasets: Array<{
        label: string;
        data: number[];
        borderColor: string;
        backgroundColor: string;
    }>;
}

// Navigation management
class NavigationManager {
    private navLinks: NodeListOf<HTMLAnchorElement>;
    
    constructor() {
        this.navLinks = document.querySelectorAll('.nav-link');
        this.init();
    }
    
    private init(): void {
        this.setupEventListeners();
        this.debugNavigation();
    }
    
    private setupEventListeners(): void {
        this.navLinks.forEach((link, index) => {
            link.addEventListener('click', (e) => this.handleNavigation(e, link));
        });
    }
    
    private handleNavigation(event: Event, link: HTMLAnchorElement): void {
        console.log('Link clicked:', link.href);
        
        if (link.href && link.href !== '#' && !link.href.includes('#')) {
            console.log('Navigating to:', link.href);
            window.location.href = link.href;
        } else {
            console.log('Invalid or hash link:', link.href);
        }
    }
    
    private debugNavigation(): void {
        console.log('Found', this.navLinks.length, 'navigation links');
        
        this.navLinks.forEach((link, index) => {
            console.log(`Link ${index}:`, link.href, link.textContent?.trim());
        });
    }
}

// Mobile menu management
class MobileMenuManager {
    private menuToggle: HTMLButtonElement | null;
    private sidebar: HTMLElement | null;
    
    constructor() {
        this.menuToggle = document.querySelector('.menu-toggle');
        this.sidebar = document.querySelector('.sidebar');
        this.init();
    }
    
    private init(): void {
        if (this.menuToggle && this.sidebar) {
            this.menuToggle.addEventListener('click', () => this.toggleSidebar());
        }
    }
    
    private toggleSidebar(): void {
        if (this.sidebar) {
            this.sidebar.classList.toggle('open');
        }
    }
}

// Chart management
class ChartManager {
    private charts: Map<string, any> = new Map();
    
    constructor() {
        this.initCharts();
    }
    
    private initCharts(): void {
        // Initialize revenue chart
        this.initRevenueChart();
        this.initSalesChart();
    }
    
    private initRevenueChart(): void {
        const ctx = document.getElementById('revenueChart') as HTMLCanvasElement;
        if (!ctx) return;
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Revenue',
                    data: [12000, 15000, 18000, 14000, 16000, 20000, 22000],
                    borderColor: '#4ba252',
                    backgroundColor: 'rgba(75, 162, 82, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
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
                            color: '#f1f5f9'
                        },
                        ticks: {
                            color: '#64748b'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#64748b'
                        }
                    }
                }
            }
        });
        
        this.charts.set('revenue', chart);
    }
    
    private initSalesChart(): void {
        const ctx = document.getElementById('salesChart') as HTMLCanvasElement;
        if (!ctx) return;
        
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Direct Sales', 'Online Sales', 'Wholesale'],
                datasets: [{
                    data: [45, 30, 25],
                    backgroundColor: ['#4ba252', '#667eea', '#f093fb'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#64748b',
                            padding: 20
                        }
                    }
                }
            }
        });
        
        this.charts.set('sales', chart);
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NavigationManager();
    new MobileMenuManager();
    new ChartManager();
});
