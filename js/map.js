// Map Page JavaScript - Handles farm map functionality
class MapDashboard {
    constructor() {
        this.map = null;
        this.markers = [];
        this.zones = [];
        this.init();
    }

    init() {
        this.loadMapData();
        this.initializeMap();
        this.setupEventListeners();
        this.updateMapDisplay();
    }

    loadMapData() {
        // Simulate map data loading
        this.zones = [
            {
                id: 'zone-a',
                name: 'Zone A - North Field',
                coordinates: { lat: 13.7563, lng: 100.5018 },
                status: 'healthy',
                metrics: {
                    soilMoisture: 68,
                    temperature: 27,
                    plantCount: 45,
                    health: 92
                }
            },
            {
                id: 'zone-b',
                name: 'Zone B - South Field',
                coordinates: { lat: 13.7543, lng: 100.5018 },
                status: 'healthy',
                metrics: {
                    soilMoisture: 62,
                    temperature: 29,
                    plantCount: 48,
                    health: 88
                }
            },
            {
                id: 'zone-c',
                name: 'Zone C - East Field',
                coordinates: { lat: 13.7563, lng: 100.5038 },
                status: 'warning',
                metrics: {
                    soilMoisture: 45,
                    temperature: 32,
                    plantCount: 42,
                    health: 75
                }
            },
            {
                id: 'zone-d',
                name: 'Zone D - West Field',
                coordinates: { lat: 13.7563, lng: 100.4998 },
                status: 'healthy',
                metrics: {
                    soilMoisture: 71,
                    temperature: 26,
                    plantCount: 49,
                    health: 95
                }
            }
        ];
    }

    initializeMap() {
        // Initialize map if container exists
        const mapContainer = document.getElementById('farmMap');
        if (!mapContainer) return;

        // Simple map implementation (you can replace with actual map library)
        this.createMapVisualization();
    }

    createMapVisualization() {
        const mapContainer = document.getElementById('farmMap');
        if (!mapContainer) return;

        // Create a simple grid-based map visualization
        mapContainer.innerHTML = `
            <div class="map-grid">
                ${this.zones.map(zone => `
                    <div class="map-zone ${zone.status}" data-zone-id="${zone.id}">
                        <div class="zone-label">${zone.name}</div>
                        <div class="zone-metrics">
                            <div class="metric">
                                <span class="metric-label">Moisture</span>
                                <span class="metric-value">${zone.metrics.soilMoisture}%</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Temp</span>
                                <span class="metric-value">${zone.metrics.temperature}°C</span>
                            </div>
                            <div class="metric">
                                <span class="metric-label">Plants</span>
                                <span class="metric-value">${zone.metrics.plantCount}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    updateMapDisplay() {
        this.updateZoneStatuses();
        this.updateMapLegend();
        this.updateZoneDetails();
    }

    updateZoneStatuses() {
        this.zones.forEach(zone => {
            const zoneElement = document.querySelector(`[data-zone-id="${zone.id}"]`);
            if (zoneElement) {
                zoneElement.className = `map-zone ${zone.status}`;
            }
        });
    }

    updateMapLegend() {
        const legendContainer = document.querySelector('.map-legend');
        if (!legendContainer) return;

        legendContainer.innerHTML = `
            <div class="legend-item">
                <span class="legend-color healthy"></span>
                <span>Healthy (${this.zones.filter(z => z.status === 'healthy').length})</span>
            </div>
            <div class="legend-item">
                <span class="legend-color warning"></span>
                <span>Warning (${this.zones.filter(z => z.status === 'warning').length})</span>
            </div>
            <div class="legend-item">
                <span class="legend-color critical"></span>
                <span>Critical (${this.zones.filter(z => z.status === 'critical').length})</span>
            </div>
        `;
    }

    updateZoneDetails() {
        const detailsContainer = document.querySelector('.zone-details');
        if (!detailsContainer) return;

        const selectedZone = this.zones[0]; // Default to first zone
        detailsContainer.innerHTML = `
            <h3>${selectedZone.name}</h3>
            <div class="zone-stats">
                <div class="stat-item">
                    <span class="stat-label">Status</span>
                    <span class="stat-value status-${selectedZone.status}">${selectedZone.status.toUpperCase()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Soil Moisture</span>
                    <span class="stat-value">${selectedZone.metrics.soilMoisture}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Temperature</span>
                    <span class="stat-value">${selectedZone.metrics.temperature}°C</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Plant Count</span>
                    <span class="stat-value">${selectedZone.metrics.plantCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Health Score</span>
                    <span class="stat-value">${selectedZone.metrics.health}%</span>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Zone selection
        document.addEventListener('click', (e) => {
            const zoneElement = e.target.closest('.map-zone');
            if (zoneElement) {
                const zoneId = zoneElement.dataset.zoneId;
                this.selectZone(zoneId);
            }
        });

        // Map controls
        const zoomInBtn = document.querySelector('.zoom-in');
        const zoomOutBtn = document.querySelector('.zoom-out');
        const resetBtn = document.querySelector('.reset-map');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.zoomIn());
        }
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetMap());
        }

        // Layer toggles
        const layerToggles = document.querySelectorAll('.layer-toggle');
        layerToggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                this.toggleLayer(e.target.value, e.target.checked);
            });
        });
    }

    selectZone(zoneId) {
        const zone = this.zones.find(z => z.id === zoneId);
        if (!zone) return;

        // Update selected zone
        document.querySelectorAll('.map-zone').forEach(el => {
            el.classList.remove('selected');
        });
        document.querySelector(`[data-zone-id="${zoneId}"]`).classList.add('selected');

        // Update zone details
        this.updateZoneDetails(zone);
    }

    updateZoneDetails(zone) {
        const detailsContainer = document.querySelector('.zone-details');
        if (!detailsContainer) return;

        detailsContainer.innerHTML = `
            <h3>${zone.name}</h3>
            <div class="zone-stats">
                <div class="stat-item">
                    <span class="stat-label">Status</span>
                    <span class="stat-value status-${zone.status}">${zone.status.toUpperCase()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Soil Moisture</span>
                    <span class="stat-value">${zone.metrics.soilMoisture}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Temperature</span>
                    <span class="stat-value">${zone.metrics.temperature}°C</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Plant Count</span>
                    <span class="stat-value">${zone.metrics.plantCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Health Score</span>
                    <span class="stat-value">${zone.metrics.health}%</span>
                </div>
            </div>
        `;
    }

    zoomIn() {
        console.log('Zooming in...');
        // Implement zoom in functionality
    }

    zoomOut() {
        console.log('Zooming out...');
        // Implement zoom out functionality
    }

    resetMap() {
        console.log('Resetting map...');
        // Implement map reset functionality
    }

    toggleLayer(layerName, visible) {
        console.log(`Toggling layer ${layerName}: ${visible}`);
        // Implement layer toggle functionality
    }
}

// Initialize map dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MapDashboard();
});
