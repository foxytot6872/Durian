// Zone Navigation JavaScript

class ZoneNavigationManager {
    constructor() {
        this.zoneData = this.initializeZoneData();
        this.init();
    }
    
    init() {
        this.setupZoneClickHandlers();
        this.setupHoverEffects();
    }
    
    initializeZoneData() {
        const data = new Map();
        
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
    
    setupZoneClickHandlers() {
        const zoneCards = document.querySelectorAll('.clickable-zone');
        
        zoneCards.forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleZoneClick(card);
            });
        });
    }
    
    handleZoneClick(card) {
        const zone = card.getAttribute('data-zone');
        const zoneName = card.getAttribute('data-zone-name');
        
        if (!zone || !zoneName) {
            console.error('Zone data not found');
            return;
        }
        
        console.log('Zone clicked:', zone, zoneName);
        
        // Store zone info in localStorage for Map page
        localStorage.setItem('selectedZone', zone);
        localStorage.setItem('selectedZoneName', zoneName);
        
        // Navigate to Map page
        window.location.href = 'Map.html';
    }
    
    setupHoverEffects() {
        const zoneCards = document.querySelectorAll('.clickable-zone');
        
        zoneCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                this.handleZoneHover(card, true);
            });
            
            card.addEventListener('mouseleave', () => {
                this.handleZoneHover(card, false);
            });
        });
    }
    
    handleZoneHover(card, isEntering) {
        if (isEntering) {
            card.style.transform = 'translateY(-5px)';
            card.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
        } else {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        }
    }
    
    getZoneData(zone) {
        return this.zoneData.get(zone);
    }
}

// Camera Feed Manager for Map page
class CameraFeedManager {
    constructor() {
        this.zoneData = this.initializeZoneData();
        this.currentZone = localStorage.getItem('selectedZone') || 'A';
        this.init();
    }
    
    init() {
        this.updateZoneContent();
        this.setupCameraControls();
    }
    
    initializeZoneData() {
        const data = new Map();
        
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
    
    updateZoneContent() {
        const selectedZone = localStorage.getItem('selectedZone') || 'A';
        const selectedZoneName = localStorage.getItem('selectedZoneName') || 'North Field';
        
        console.log('Updating zone content for:', selectedZone, selectedZoneName);
        
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
    
    updateZoneMetrics(zone) {
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
    
    setupCameraControls() {
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
                this.toggleRecording(recordBtn);
            });
        }
        
        // Setup valve controls
        this.setupValveControls();
        
        // Setup status dashboard
        this.setupStatusDashboard();
    }
    
    setupValveControls() {
        // Watering valve control
        const wateringValve = document.getElementById('wateringValve');
        if (wateringValve) {
            wateringValve.addEventListener('change', (e) => {
                this.handleValveToggle('watering', e.target.checked);
            });
        }
        
        // Fertilizer valve control
        const fertilizerValve = document.getElementById('fertilizerValve');
        if (fertilizerValve) {
            fertilizerValve.addEventListener('change', (e) => {
                this.handleValveToggle('fertilizer', e.target.checked);
            });
        }
        
        // Pest control valve
        const pestControlValve = document.getElementById('pestControlValve');
        if (pestControlValve) {
            pestControlValve.addEventListener('change', (e) => {
                this.handleValveToggle('pestControl', e.target.checked);
            });
        }
    }
    
    handleValveToggle(system, isOn) {
        console.log(`${system} valve ${isOn ? 'opened' : 'closed'}`);
        
        // Update valve status indicator
        const statusDot = document.getElementById('valveStatusDot');
        const statusText = document.getElementById('valveStatusText');
        
        if (statusDot && statusText) {
            if (isOn) {
                statusDot.style.background = '#4ba252';
                statusText.textContent = `${system.charAt(0).toUpperCase() + system.slice(1)} Active`;
            } else {
                statusDot.style.background = '#64748b';
                statusText.textContent = 'System Ready';
            }
        }
        
        // Update metrics based on system
        this.updateValveMetrics(system, isOn);
    }
    
    updateValveMetrics(system, isOn) {
        if (system === 'watering' && isOn) {
            // Simulate watering metrics
            const pressureElement = document.getElementById('waterPressure');
            const flowElement = document.getElementById('flowRate');
            
            if (pressureElement) pressureElement.textContent = '2.8 bar';
            if (flowElement) flowElement.textContent = '18 L/min';
        }
        
        if (system === 'fertilizer' && isOn) {
            // Simulate fertilizer metrics
            const levelElement = document.getElementById('fertilizerLevel');
            const concentrationElement = document.getElementById('fertilizerConcentration');
            
            if (levelElement) levelElement.textContent = '72%';
            if (concentrationElement) concentrationElement.textContent = '2.8%';
        }
        
        if (system === 'pestControl' && isOn) {
            // Simulate pest control metrics
            const coverageElement = document.getElementById('sprayCoverage');
            const tankElement = document.getElementById('tankLevel');
            
            if (coverageElement) coverageElement.textContent = '98%';
            if (tankElement) tankElement.textContent = '58%';
        }
    }
    
    setupStatusDashboard() {
        // Setup filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.getAttribute('data-filter');
                this.filterStatusCards(filter);
                
                // Update active button
                filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Generate status cards
        this.generateStatusCards();
    }
    
    generateStatusCards() {
        const statusCardsGrid = document.getElementById('statusCardsGrid');
        if (!statusCardsGrid) return;
        
        const statusData = this.getZoneStatusData();
        statusCardsGrid.innerHTML = '';
        
        statusData.forEach(status => {
            const card = this.createStatusCard(status);
            statusCardsGrid.appendChild(card);
        });
    }
    
    getZoneStatusData() {
        const selectedZone = localStorage.getItem('selectedZone') || 'A';
        
        const statusData = {
            'A': [
                {
                    type: 'watering',
                    title: 'Watering Status',
                    status: 'healthy',
                    content: 'Optimal moisture levels maintained. Next scheduled watering in 4 hours.',
                    time: '2 hours ago'
                },
                {
                    type: 'fertilizer',
                    title: 'Fertilizer Status',
                    status: 'warning',
                    content: 'Nitrogen levels below optimal. Consider applying NPK fertilizer.',
                    time: '3 days ago'
                },
                {
                    type: 'disease',
                    title: 'Plant Health',
                    status: 'healthy',
                    content: 'All plants showing healthy growth. No signs of disease detected.',
                    time: '1 day ago'
                }
            ],
            'B': [
                {
                    type: 'watering',
                    title: 'Watering Status',
                    status: 'healthy',
                    content: 'Moisture levels optimal. Irrigation system functioning normally.',
                    time: '1 hour ago'
                },
                {
                    type: 'fertilizer',
                    title: 'Fertilizer Status',
                    status: 'healthy',
                    content: 'Nutrient levels balanced. Last application successful.',
                    time: '1 week ago'
                },
                {
                    type: 'disease',
                    title: 'Plant Health',
                    status: 'warning',
                    content: 'Minor leaf discoloration detected. Monitoring required.',
                    time: '2 days ago'
                }
            ],
            'C': [
                {
                    type: 'watering',
                    title: 'Watering Status',
                    status: 'critical',
                    content: 'Low moisture levels detected. Immediate irrigation required.',
                    time: '30 minutes ago'
                },
                {
                    type: 'fertilizer',
                    title: 'Fertilizer Status',
                    status: 'healthy',
                    content: 'Nutrient levels adequate for current growth stage.',
                    time: '5 days ago'
                },
                {
                    type: 'disease',
                    title: 'Plant Health',
                    status: 'critical',
                    content: 'Fungal infection detected. Treatment required immediately.',
                    time: '6 hours ago'
                }
            ],
            'D': [
                {
                    type: 'watering',
                    title: 'Watering Status',
                    status: 'healthy',
                    content: 'Excellent moisture distribution. System operating efficiently.',
                    time: '3 hours ago'
                },
                {
                    type: 'fertilizer',
                    title: 'Fertilizer Status',
                    status: 'healthy',
                    content: 'All nutrients at optimal levels. Growth rate excellent.',
                    time: '2 days ago'
                },
                {
                    type: 'disease',
                    title: 'Plant Health',
                    status: 'healthy',
                    content: 'Vigorous growth with no disease symptoms observed.',
                    time: '1 day ago'
                }
            ]
        };
        
        return statusData[selectedZone] || statusData['A'];
    }
    
    createStatusCard(status) {
        const card = document.createElement('div');
        card.className = `status-card ${status.status}`;
        card.setAttribute('data-type', status.type);
        
        card.innerHTML = `
            <div class="status-card-header">
                <h4 class="status-card-title">${status.title}</h4>
                <span class="status-badge ${status.status}">${status.status}</span>
            </div>
            <div class="status-card-content">
                <p>${status.content}</p>
                <small style="color: #94a3b8;">${status.time}</small>
            </div>
        `;
        
        return card;
    }
    
    filterStatusCards(filter) {
        const cards = document.querySelectorAll('.status-card');
        
        cards.forEach(card => {
            if (filter === 'all' || card.getAttribute('data-type') === filter) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    toggleRecording(btn) {
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
    
    console.log('Current page:', currentPage);
    
    if (currentPage.includes('dashboard.html') || currentPage.includes('dashboard')) {
        console.log('Initializing ZoneNavigationManager');
        new ZoneNavigationManager();
    } else if (currentPage.includes('Map.html') || currentPage.includes('map')) {
        console.log('Initializing CameraFeedManager');
        new CameraFeedManager();
    }
});
