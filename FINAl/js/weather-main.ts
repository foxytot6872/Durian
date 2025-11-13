// Weather Page TypeScript

// Weather data interfaces
interface WeatherData {
    temperature: number;
    humidity: number;
    windSpeed: number;
    rainChance: number;
    timestamp: string;
}

interface ForecastData {
    date: string;
    temperature: number;
    condition: string;
    rainChance: number;
    windSpeed: number;
}

// Weather API management
class WeatherAPIManager {
    private apiKey: string = 'your-api-key-here';
    private baseUrl: string = 'https://api.openweathermap.org/data/2.5';
    
    async getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
        try {
            const response = await fetch(
                `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
            );
            const data = await response.json();
            
            return {
                temperature: Math.round(data.main.temp),
                humidity: data.main.humidity,
                windSpeed: data.wind.speed,
                rainChance: data.rain ? data.rain['1h'] || 0 : 0,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error fetching weather data:', error);
            return this.getDefaultWeatherData();
        }
    }
    
    private getDefaultWeatherData(): WeatherData {
        return {
            temperature: 28,
            humidity: 75,
            windSpeed: 12,
            rainChance: 20,
            timestamp: new Date().toISOString()
        };
    }
}

// Weather map management
class WeatherMapManager {
    private mapContainer: HTMLElement | null;
    private map: any;
    
    constructor() {
        this.mapContainer = document.getElementById('weatherMap');
        this.init();
    }
    
    private init(): void {
        if (this.mapContainer) {
            this.initializeMap();
        }
    }
    
    private initializeMap(): void {
        // Initialize weather map using Windy API
        if (typeof windyInit === 'function') {
            windyInit({
                key: 'your-windy-api-key',
                lat: 13.7563,
                lon: 100.5018,
                zoom: 6
            });
        } else {
            this.showMapPlaceholder();
        }
    }
    
    private showMapPlaceholder(): void {
        if (this.mapContainer) {
            this.mapContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #64748b;">
                    <i class="fas fa-map" style="font-size: 3rem; margin-bottom: 1rem; color: #4ba252;"></i>
                    <h3>Weather Map</h3>
                    <p>Interactive weather map will be displayed here</p>
                </div>
            `;
        }
    }
}

// Weather chart management
class WeatherChartManager {
    private charts: Map<string, any> = new Map();
    
    constructor() {
        this.initCharts();
    }
    
    private initCharts(): void {
        this.initTemperatureChart();
        this.initHumidityChart();
    }
    
    private initTemperatureChart(): void {
        const ctx = document.getElementById('temperatureChart') as HTMLCanvasElement;
        if (!ctx) return;
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
                datasets: [{
                    label: 'Temperature (°C)',
                    data: [24, 26, 30, 32, 28, 25],
                    borderColor: '#f093fb',
                    backgroundColor: 'rgba(240, 147, 251, 0.1)',
                    borderWidth: 3,
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
        
        this.charts.set('temperature', chart);
    }
    
    private initHumidityChart(): void {
        const ctx = document.getElementById('humidityChart') as HTMLCanvasElement;
        if (!ctx) return;
        
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Humidity (%)',
                    data: [65, 70, 68, 72, 75, 80, 78],
                    backgroundColor: '#4facfe',
                    borderColor: '#4facfe',
                    borderWidth: 0
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
        
        this.charts.set('humidity', chart);
    }
}

// Navigation management (shared)
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
        this.navLinks.forEach((link) => {
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

// Mobile menu management (shared)
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

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NavigationManager();
    new MobileMenuManager();
    new WeatherAPIManager();
    new WeatherMapManager();
    new WeatherChartManager();
});
