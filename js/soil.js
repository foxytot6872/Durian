// Soil Analysis Page JavaScript - Handles soil monitoring functionality
class SoilDashboard {
    constructor() {
        this.soilData = null;
        this.charts = {};
        this.init();
    }

    init() {
        this.loadSoilData();
        this.initializeCharts();
        this.setupEventListeners();
        this.updateSoilDisplay();
    }

    loadSoilData() {
        // Simulate soil data loading
        this.soilData = {
            summary: {
                overallHealth: 85,
                phLevel: 6.2,
                moisture: 65,
                temperature: 28,
                nutrients: {
                    nitrogen: 75,
                    phosphorus: 68,
                    potassium: 82,
                    organicMatter: 4.2
                }
            },
            zones: [
                {
                    name: 'Zone A',
                    ph: 6.1,
                    moisture: 68,
                    temperature: 27,
                    nutrients: { nitrogen: 78, phosphorus: 70, potassium: 85 },
                    health: 88
                },
                {
                    name: 'Zone B',
                    ph: 6.3,
                    moisture: 62,
                    temperature: 29,
                    nutrients: { nitrogen: 72, phosphorus: 65, potassium: 80 },
                    health: 82
                },
                {
                    name: 'Zone C',
                    ph: 5.8,
                    moisture: 45,
                    temperature: 32,
                    nutrients: { nitrogen: 65, phosphorus: 58, potassium: 70 },
                    health: 65
                },
                {
                    name: 'Zone D',
                    ph: 6.4,
                    moisture: 71,
                    temperature: 26,
                    nutrients: { nitrogen: 80, phosphorus: 75, potassium: 88 },
                    health: 92
                }
            ],
            history: {
                ph: [6.0, 6.1, 6.2, 6.1, 6.3, 6.2, 6.2],
                moisture: [60, 65, 68, 62, 70, 65, 65],
                temperature: [26, 27, 28, 29, 27, 28, 28],
                nitrogen: [70, 72, 75, 73, 78, 75, 75],
                phosphorus: [65, 67, 68, 66, 70, 68, 68],
                potassium: [78, 80, 82, 79, 85, 82, 82]
            }
        };
    }

    updateSoilDisplay() {
        this.updateSummaryCards();
        this.updateZoneTable();
        this.updateNutrientBreakdown();
        this.updateRecommendations();
    }

    updateSummaryCards() {
        const summary = this.soilData.summary;
        
        this.updateCard('.ph-card .value', summary.phLevel.toFixed(1));
        this.updateCard('.moisture-card .value', `${summary.moisture}%`);
        this.updateCard('.temp-card .value', `${summary.temperature}°C`);
        this.updateCard('.health-card .value', `${summary.overallHealth}%`);
    }

    updateCard(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }

    updateZoneTable() {
        const tbody = document.getElementById('zonesTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.soilData.zones.map(zone => `
            <tr>
                <td>${zone.name}</td>
                <td>${zone.ph.toFixed(1)}</td>
                <td>${zone.moisture}%</td>
                <td>${zone.temperature}°C</td>
                <td>${zone.nutrients.nitrogen}%</td>
                <td>${zone.nutrients.phosphorus}%</td>
                <td>${zone.nutrients.potassium}%</td>
                <td><span class="health-score ${this.getHealthClass(zone.health)}">${zone.health}%</span></td>
            </tr>
        `).join('');
    }

    updateNutrientBreakdown() {
        const container = document.querySelector('.nutrient-breakdown');
        if (!container) return;

        const nutrients = this.soilData.summary.nutrients;
        container.innerHTML = Object.entries(nutrients).map(([nutrient, value]) => `
            <div class="nutrient-item">
                <div class="nutrient-label">${nutrient.charAt(0).toUpperCase() + nutrient.slice(1)}</div>
                <div class="nutrient-bar">
                    <div class="nutrient-fill" style="width: ${value}%"></div>
                </div>
                <div class="nutrient-value">${value}%</div>
            </div>
        `).join('');
    }

    updateRecommendations() {
        const container = document.querySelector('.recommendations');
        if (!container) return;

        const recommendations = this.generateRecommendations();
        container.innerHTML = recommendations.map(rec => `
            <div class="recommendation-item ${rec.priority}">
                <div class="rec-icon">
                    <i class="fas fa-${rec.icon}"></i>
                </div>
                <div class="rec-content">
                    <div class="rec-title">${rec.title}</div>
                    <div class="rec-description">${rec.description}</div>
                </div>
            </div>
        `).join('');
    }

    generateRecommendations() {
        const recommendations = [];
        const summary = this.soilData.summary;

        // pH recommendations
        if (summary.phLevel < 6.0) {
            recommendations.push({
                title: 'Increase Soil pH',
                description: 'Add lime to raise pH to optimal range (6.0-6.5)',
                priority: 'high',
                icon: 'arrow-up'
            });
        } else if (summary.phLevel > 6.5) {
            recommendations.push({
                title: 'Decrease Soil pH',
                description: 'Add sulfur or organic matter to lower pH',
                priority: 'medium',
                icon: 'arrow-down'
            });
        }

        // Moisture recommendations
        if (summary.moisture < 50) {
            recommendations.push({
                title: 'Increase Irrigation',
                description: 'Soil moisture is below optimal. Increase watering frequency.',
                priority: 'high',
                icon: 'tint'
            });
        } else if (summary.moisture > 80) {
            recommendations.push({
                title: 'Reduce Irrigation',
                description: 'Soil is too wet. Reduce watering to prevent root rot.',
                priority: 'medium',
                icon: 'tint-slash'
            });
        }

        // Nutrient recommendations
        if (summary.nutrients.nitrogen < 70) {
            recommendations.push({
                title: 'Add Nitrogen Fertilizer',
                description: 'Nitrogen levels are low. Apply nitrogen-rich fertilizer.',
                priority: 'high',
                icon: 'seedling'
            });
        }

        if (summary.nutrients.phosphorus < 65) {
            recommendations.push({
                title: 'Add Phosphorus',
                description: 'Phosphorus levels are low. Apply phosphorus fertilizer.',
                priority: 'medium',
                icon: 'leaf'
            });
        }

        return recommendations;
    }

    getHealthClass(health) {
        if (health >= 85) return 'excellent';
        if (health >= 70) return 'good';
        if (health >= 55) return 'fair';
        return 'poor';
    }

    initializeCharts() {
        this.createPhChart();
        this.createMoistureChart();
        this.createNutrientChart();
        this.createTemperatureChart();
    }

    createPhChart() {
        const ctx = document.getElementById('phChart');
        if (!ctx) return;

        this.charts.ph = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'],
                datasets: [{
                    label: 'pH Level',
                    data: this.soilData.history.ph,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: true
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
                        min: 5.0,
                        max: 7.0,
                        title: {
                            display: true,
                            text: 'pH Level'
                        }
                    }
                }
            }
        });
    }

    createMoistureChart() {
        const ctx = document.getElementById('moistureChart');
        if (!ctx) return;

        this.charts.moisture = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'],
                datasets: [{
                    label: 'Soil Moisture (%)',
                    data: this.soilData.history.moisture,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: '#3b82f6',
                    borderWidth: 1
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
                        title: {
                            display: true,
                            text: 'Moisture (%)'
                        }
                    }
                }
            }
        });
    }

    createNutrientChart() {
        const ctx = document.getElementById('nutrientChart');
        if (!ctx) return;

        this.charts.nutrient = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Nitrogen', 'Phosphorus', 'Potassium', 'Organic Matter'],
                datasets: [{
                    label: 'Current Levels',
                    data: [
                        this.soilData.summary.nutrients.nitrogen,
                        this.soilData.summary.nutrients.phosphorus,
                        this.soilData.summary.nutrients.potassium,
                        this.soilData.summary.nutrients.organicMatter * 20 // Scale for radar chart
                    ],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    pointBackgroundColor: '#10b981'
                }, {
                    label: 'Optimal Range',
                    data: [80, 75, 85, 80],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    pointBackgroundColor: '#f59e0b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    createTemperatureChart() {
        const ctx = document.getElementById('temperatureChart');
        if (!ctx) return;

        this.charts.temperature = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'],
                datasets: [{
                    label: 'Soil Temperature (°C)',
                    data: this.soilData.history.temperature,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
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
                        title: {
                            display: true,
                            text: 'Temperature (°C)'
                        }
                    }
                }
            }
        });
    }

    setupEventListeners() {
        // Zone selection
        const zoneRows = document.querySelectorAll('#zonesTableBody tr');
        zoneRows.forEach((row, index) => {
            row.addEventListener('click', () => {
                this.selectZone(index);
            });
        });

        // Export data
        const exportBtn = document.querySelector('.export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportSoilData();
            });
        }

        // Refresh data
        const refreshBtn = document.querySelector('.refresh-data-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshSoilData();
            });
        }
    }

    selectZone(zoneIndex) {
        const zone = this.soilData.zones[zoneIndex];
        if (!zone) return;

        // Update zone details
        this.updateZoneDetails(zone);
    }

    updateZoneDetails(zone) {
        const detailsContainer = document.querySelector('.zone-details');
        if (!detailsContainer) return;

        detailsContainer.innerHTML = `
            <h3>${zone.name} Details</h3>
            <div class="zone-metrics">
                <div class="metric">
                    <span class="metric-label">pH Level</span>
                    <span class="metric-value">${zone.ph.toFixed(1)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Moisture</span>
                    <span class="metric-value">${zone.moisture}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Temperature</span>
                    <span class="metric-value">${zone.temperature}°C</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Health Score</span>
                    <span class="metric-value">${zone.health}%</span>
                </div>
            </div>
        `;
    }

    exportSoilData() {
        console.log('Exporting soil data...');
        // Implement data export functionality
    }

    refreshSoilData() {
        console.log('Refreshing soil data...');
        this.loadSoilData();
        this.updateSoilDisplay();
    }
}

// Initialize soil dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SoilDashboard();
});
