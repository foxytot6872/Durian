// Zone Navigation TypeScript

interface ZoneData {
    name: string;
    description: string;
    metrics: {
        [key: string]: string;
    };
}

class ZoneNavigationManager {
    private zoneData: Map<string, ZoneData>;
    
    constructor() {
        this.zoneData = this.initializeZoneData();
        this.init();
    }
    
    private init(): void {
        this.setupZoneClickHandlers();
        this.setupHoverEffects();
    }
    
    private initializeZoneData(): Map<string, ZoneData> {
        const data = new Map<string, ZoneData>();
        
        data.set('A', {
            name: 'North Field',
            description: 'Monitoring durian trees and soil conditions',
            metrics: {
                'Soil Moisture': '68%',
                'Temperature': '27°C',
                'Humidity': '75%',
                'Plants': '45/50',
                'Last Update': '2 hours ago'
            }
        });
        
        data.set('B', {
            name: 'South Field',
            description: 'Monitoring durian trees and soil conditions',
            metrics: {
                'Soil Moisture': '62%',
                'Temperature': '29°C',
                'Humidity': '70%',
                'Plants': '48/50',
                'Last Update': '1 hour ago'
            }
        });
        
        data.set('C', {
            name: 'East Field',
            description: 'Monitoring durian trees and soil conditions',
            metrics: {
                'Soil Moisture': '45%',
                'Temperature': '32°C',
                'Humidity': '65%',
                'Plants': '42/50',
                'Last Update': '30 minutes ago'
            }
        });
        
        data.set('D', {
            name: 'West Field',
            description: 'Monitoring durian trees and soil conditions',
            metrics: {
                'Soil Moisture': '71%',
                'Temperature': '26°C',
                'Humidity': '80%',
                'Plants': '49/50',
                'Last Update': '1 hour ago'
            }
        });
        
        return data;
    }
    
    private setupZoneClickHandlers(): void {
        const zoneCards = document.querySelectorAll('.clickable-zone');
        
        zoneCards.forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleZoneClick(card as HTMLElement);
            });
        });
    }
    
    private handleZoneClick(card: HTMLElement): void {
        const zone = card.getAttribute('data-zone');
        const zoneName = card.getAttribute('data-zone-name');
        
        if (!zone || !zoneName) {
            console.error('Zone data not found');
            return;
        }
        
        // Store zone info in localStorage for Map page
        localStorage.setItem('selectedZone', zone);
        localStorage.setItem('selectedZoneName', zoneName);
        
        // Navigate to Map page
        window.location.href = 'Map.html';
    }
    
    private setupHoverEffects(): void {
        const zoneCards = document.querySelectorAll('.clickable-zone');
        
        zoneCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                this.handleZoneHover(card as HTMLElement, true);
            });
            
            card.addEventListener('mouseleave', () => {
                this.handleZoneHover(card as HTMLElement, false);
            });
        });
    }
    
    private handleZoneHover(card: HTMLElement, isEntering: boolean): void {
        if (isEntering) {
            card.style.transform = 'translateY(-5px)';
            card.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
        } else {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        }
    }
    
    public getZoneData(zone: string): ZoneData | undefined {
        return this.zoneData.get(zone);
    }
}

// Camera Feed Manager for Map page
class CameraFeedManager {
    private currentZone: string;
    private zoneData: Map<string, ZoneData>;
    
    constructor() {
        this.zoneData = this.initializeZoneData();
        this.currentZone = localStorage.getItem('selectedZone') || 'A';
        this.init();
    }
    
    private init(): void {
        this.updateZoneContent();
        this.setupCameraControls();
    }
    
    private initializeZoneData(): Map<string, ZoneData> {
        const data = new Map<string, ZoneData>();
        
        data.set('A', {
            name: 'North Field',
            description: 'Monitoring durian trees and soil conditions',
            metrics: {
                'Soil Moisture': '68%',
                'Temperature': '27°C',
                'Humidity': '75%',
                'Plants': '45/50',
                'Last Update': '2 hours ago'
            }
        });
        
        data.set('B', {
            name: 'South Field',
            description: 'Monitoring durian trees and soil conditions',
            metrics: {
                'Soil Moisture': '62%',
                'Temperature': '29°C',
                'Humidity': '70%',
                'Plants': '48/50',
                'Last Update': '1 hour ago'
            }
        });
        
        data.set('C', {
            name: 'East Field',
            description: 'Monitoring durian trees and soil conditions',
            metrics: {
                'Soil Moisture': '45%',
                'Temperature': '32°C',
                'Humidity': '65%',
                'Plants': '42/50',
                'Last Update': '30 minutes ago'
            }
        });
        
        data.set('D', {
            name: 'West Field',
            description: 'Monitoring durian trees and soil conditions',
            metrics: {
                'Soil Moisture': '71%',
                'Temperature': '26°C',
                'Humidity': '80%',
                'Plants': '49/50',
                'Last Update': '1 hour ago'
            }
        });
        
        return data;
    }
    
    private updateZoneContent(): void {
        const selectedZone = localStorage.getItem('selectedZone') || 'A';
        const selectedZoneName = localStorage.getItem('selectedZoneName') || 'North Field';
        
        // Update titles
        const zoneTitle = document.getElementById('zoneTitle');
        const cameraTitle = document.getElementById('cameraTitle');
        const cameraDescription = document.getElementById('cameraDescription');
        
        if (zoneTitle) {
            zoneTitle.textContent = `Zone ${selectedZone} - ${selectedZoneName}`;
        }
        
        if (cameraTitle) {
            cameraTitle.textContent = `Zone ${selectedZone} - ${selectedZoneName} Live Feed`;
        }
        
        const data = this.zoneData.get(selectedZone);
        if (data && cameraDescription) {
            cameraDescription.textContent = data.description;
        }
        
        // Update zone metrics
        this.updateZoneMetrics(selectedZone);
    }
    
    private updateZoneMetrics(zone: string): void {
        const metricsContainer = document.getElementById('zoneMetrics');
        if (!metricsContainer) return;
        
        const data = this.zoneData.get(zone);
        if (!data) return;
        
        metricsContainer.innerHTML = '';
        
        Object.entries(data.metrics).forEach(([label, value]) => {
            const metricDiv = document.createElement('div');
            metricDiv.className = 'zone-metric';
            metricDiv.innerHTML = `
                <span class="metric-label">${label}</span>
                <span class="metric-value">${value}</span>
            `;
            metricsContainer.appendChild(metricDiv);
        });
    }
    
    private setupCameraControls(): void {
        // Back button functionality
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = 'dashboard.html';
            });
        }
        
        // Fullscreen functionality
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                const cameraFeed = document.getElementById('cameraFeed');
                if (cameraFeed && cameraFeed.requestFullscreen) {
                    cameraFeed.requestFullscreen();
                }
            });
        }
        
        // Record functionality
        const recordBtn = document.getElementById('recordBtn');
        if (recordBtn) {
            recordBtn.addEventListener('click', () => {
                this.toggleRecording(recordBtn as HTMLButtonElement);
            });
        }
    }
    
    private toggleRecording(btn: HTMLButtonElement): void {
        if (btn.classList.contains('recording')) {
            btn.classList.remove('recording');
            btn.innerHTML = '<i class="fas fa-video"></i> Record';
            btn.style.background = '#f1f5f9';
            btn.style.color = '#64748b';
        } else {
            btn.classList.add('recording');
            btn.innerHTML = '<i class="fas fa-stop"></i> Stop Recording';
            btn.style.background = '#ef4444';
            btn.style.color = 'white';
        }
    }
}

// Initialize based on current page
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('dashboard.html')) {
        new ZoneNavigationManager();
    } else if (currentPage.includes('Map.html')) {
        new CameraFeedManager();
    }
});
