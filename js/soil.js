// Soil Analysis Page JavaScript - Uses Firebase Dashboard Manager
class SoilDashboard {
    constructor() {
        this.selectedZone = null;
        this.firebaseDashboard = null;
        this.zones = [];
        this.soilChart = null;
        this.trendMode = 'day';
        this.init();
    }

    init() {
        this.waitForFirebase();
    }

    waitForFirebase() {
        if (window.firebaseDashboard) {
            this.firebaseDashboard = window.firebaseDashboard;
            this.setupFirebaseListener();
            this.setupTrendControls();
            this.loadZones();
        } else {
            setTimeout(() => this.waitForFirebase(), 500);
        }
    }

    setupFirebaseListener() {
        if (this.firebaseDashboard) {
            // Register callback to be notified when data updates
            this.firebaseDashboard.onUpdate(() => {
                this.loadZones();
                this.updateSoilDisplay();
                this.updateTrendDisplay();
            });

            window.addEventListener('virtual-sensors:test-scenario-change', () => {
                this.updateSoilDisplay();
                this.updateTrendDisplay();
            });

            // Initial update
            this.loadZones();
            this.updateSoilDisplay();
            this.updateTrendDisplay();
        }
    }

    setupTrendControls() {
        const select = document.getElementById('soilTrendMode');
        if (select) {
            select.addEventListener('change', (event) => {
                this.trendMode = event.target.value;
                this.updateTrendDisplay();
            });
        }

        const refreshButton = document.querySelector('[data-refresh-graph]');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                refreshButton.disabled = true;
                refreshButton.classList.add('is-refreshing');
                this.updateTrendDisplay();
                setTimeout(() => {
                    refreshButton.classList.remove('is-refreshing');
                    refreshButton.disabled = false;
                }, 350);
            });
        }
    }

    loadZones() {
        if (!this.firebaseDashboard) return;

        const allDevices = this.firebaseDashboard.getDevices();

        // Group devices by zone
        const zonesMap = new Map();
        for (const device of allDevices) {
            const zone = device.zone;
            if (!zone) continue;

            if (!zonesMap.has(zone)) {
                zonesMap.set(zone, []);
            }
            zonesMap.get(zone).push(device);
        }

        this.zones = Array.from(zonesMap.keys()).sort((a, b) => {
            const zoneA = a.replace('Zone ', '').trim();
            const zoneB = b.replace('Zone ', '').trim();
            return zoneA.localeCompare(zoneB);
        });

        this.renderZoneButtons();

        // Select first zone if none selected
        if (!this.selectedZone && this.zones.length > 0) {
            this.selectZone(this.zones[0]);
        }
    }

    renderZoneButtons() {
        const container = document.getElementById('zoneButtonsContainer');
        if (!container) return;

        if (this.zones.length === 0) {
            container.innerHTML = '<p style="color: #718096; padding: 1rem;">No zones with devices found. Claim a device to get started.</p>';
            return;
        }

        container.innerHTML = '';

        this.zones.forEach(zone => {
            const zoneLetter = zone.replace('Zone ', '').trim();
            const button = document.createElement('button');
            button.className = 'zone-btn';
            button.setAttribute('data-zone', zoneLetter);
            button.textContent = zone;
            button.style.cssText = 'padding: 0.5rem 1rem; border: 2px solid #ddd; background: white; color: #333; border-radius: 5px; cursor: pointer;';

            if (this.selectedZone === zone) {
                button.classList.add('active');
                button.style.background = '#4CAF50';
                button.style.color = 'white';
                button.style.border = '2px solid #4CAF50';
            }

            button.addEventListener('click', () => {
                this.selectZone(zone);
            });

            container.appendChild(button);
        });
    }

    selectZone(zone) {
        this.selectedZone = zone;
        this.renderZoneButtons();
        this.updateSoilDisplay();
        this.updateZoneStatus();
        this.updateTrendDisplay();
    }

    updateZoneStatus() {
        const statusEl = document.getElementById('zone-status');
        if (!statusEl) return;

        if (!this.selectedZone) {
            statusEl.innerHTML = '📡 Please select a zone';
            statusEl.style.background = '#f0f0f0';
            statusEl.style.color = '#666';
            return;
        }

        const devices = this.firebaseDashboard.getDevicesByZone(this.selectedZone);
        if (devices.length === 0) {
            statusEl.innerHTML = `📡 No devices found for ${this.selectedZone}`;
            statusEl.style.background = '#f0f0f0';
            statusEl.style.color = '#666';
            return;
        }

        const device = devices[0];
        if (device.sensorData && device.sensorData.timestamp) {
            const timestamp = this.formatTimestamp(device.sensorData.timestamp);
            statusEl.innerHTML = `Live data from ${this.selectedZone} - Last update: ${timestamp}`;
            statusEl.style.background = '#d4edda';
            statusEl.style.color = '#155724';
        } else {
            statusEl.innerHTML = `📡 Waiting for sensor data from ${this.selectedZone}...`;
            statusEl.style.background = '#f0f0f0';
            statusEl.style.color = '#666';
        }
    }

    updateSoilDisplay() {
        if (!this.firebaseDashboard || !this.selectedZone) return;

        const devices = this.firebaseDashboard.getDevicesByZone(this.selectedZone);
        if (devices.length === 0) {
            this.clearDisplay();
            return;
        }

        // Use first device's sensor data (or aggregate if multiple)
        const device = devices[0];
        const sensorData = device.sensorData;

        if (!sensorData) {
            this.clearDisplay();
            return;
        }

        // Update all soil metrics
        this.updateMetric('soil-moisture', sensorData.moisture, '%', 'moisture-change', (val) => {
            if (val < 30) return { text: 'Low', class: 'negative' };
            if (val < 50) return { text: 'Moderate', class: 'warning' };
            return { text: 'Optimal', class: 'positive' };
        });

        this.updateMetric('soil-ph', sensorData.ph, '', 'ph-status', (val) => {
            if (val < 6.0 || val > 7.5) return { text: 'Needs Adjustment', class: 'negative' };
            return { text: 'Optimal', class: 'positive' };
        }, true);

        this.updateMetric('soil-temperature', sensorData.temperature, '°C', 'temp-change', (val) => {
            if (val < 20 || val > 35) return { text: 'Extreme', class: 'negative' };
            if (val < 25 || val > 30) return { text: 'Moderate', class: 'warning' };
            return { text: 'Optimal', class: 'positive' };
        });

        this.updateMetric('soil-ec', sensorData.ec, ' µS/cm', 'ec-status', (val) => {
            if (val > 2000) return { text: 'High', class: 'warning' };
            return { text: 'Normal', class: 'positive' };
        });

        this.updateMetric('soil-nitrogen', sensorData.n, ' mg/kg', 'nitrogen-status', (val) => {
            if (val < 10) return { text: 'Low', class: 'negative' };
            return { text: 'Optimal', class: 'positive' };
        });

        this.updateMetric('soil-phosphorus', sensorData.p, ' mg/kg', 'phosphorus-status', (val) => {
            if (val < 5) return { text: 'Low', class: 'negative' };
            return { text: 'Optimal', class: 'positive' };
        });

        this.updateMetric('soil-potassium', sensorData.k, ' mg/kg', 'potassium-status', (val) => {
            if (val < 5) return { text: 'Low', class: 'negative' };
            return { text: 'Optimal', class: 'positive' };
        });

        this.updateZoneStatus();
        this.updateFarmStatus();
        this.updateTrendDisplay();
    }

    updateFarmStatus() {
        const store = window.VirtualSensorData;
        if (!store) return;

        const summary = store.getFarmStatus(this.selectedZone);
        const overview = document.getElementById('farmTrendOverview');
        const title = document.getElementById('farmStatusTitle');
        const description = document.getElementById('farmStatusDescription');
        const score = document.getElementById('farmStatusScore');

        if (overview) {
            overview.className = `farm-trend-overview ${summary.status}`;
        }
        if (title) {
            title.textContent = `${summary.text} ${this.selectedZone ? `- ${this.selectedZone}` : ''}`;
        }
        if (description) {
            description.textContent = summary.description;
        }
        if (score) {
            score.textContent = summary.score;
        }
    }

    updateTrendDisplay() {
        const store = window.VirtualSensorData;
        if (!store || !this.selectedZone) return;

        const zone = this.selectedZone;
        let records = [];
        let labels = [];
        let title = '';

        if (this.trendMode === 'week') {
            records = store.getDailyTrend(zone).slice(-7);
            labels = records.map(record => record.label);
            title = 'Week';
        } else if (this.trendMode === 'month') {
            records = store.getMonthlyTrend(zone);
            labels = records.map(record => record.label);
            title = 'Month';
        } else if (this.trendMode === 'year') {
            records = store.getYearlyTrend(zone);
            labels = records.map(record => record.label);
            title = 'Year';
        } else {
            records = store.getHourlyTrend(0, zone);
            labels = records.map(record => {
                const date = new Date(record.timestamp);
                return `${String(date.getHours()).padStart(2, '0')}:00`;
            });
            title = 'Day';
        }

        this.renderTrendChart(labels, records, title);
        this.renderTrendList(records);
    }

    renderTrendChart(labels, records, title) {
        const canvas = document.getElementById('soilChart');
        if (!canvas || typeof Chart === 'undefined') return;

        const chartData = {
            labels,
            datasets: [
                {
                    label: 'Health Score',
                    data: records.map(record => record.score),
                    borderColor: '#4ba252',
                    backgroundColor: 'rgba(75, 162, 82, 0.12)',
                    fill: true,
                    tension: 0.35,
                    yAxisID: 'score'
                },
                {
                    label: 'Moisture %',
                    data: records.map(record => record.moisture),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    tension: 0.35,
                    yAxisID: 'score'
                },
                {
                    label: 'Soil Temp °C',
                    data: records.map(record => record.temperature),
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.08)',
                    tension: 0.35,
                    yAxisID: 'temp'
                }
            ]
        };

        if (!this.soilChart) {
            this.soilChart = new Chart(canvas, {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: title
                        },
                        legend: {
                            position: 'bottom'
                        }
                    },
                    scales: {
                        score: {
                            type: 'linear',
                            position: 'left',
                            min: 0,
                            max: 100
                        },
                        temp: {
                            type: 'linear',
                            position: 'right',
                            grid: {
                                drawOnChartArea: false
                            }
                        }
                    }
                }
            });
            return;
        }

        this.soilChart.data = chartData;
        this.soilChart.options.plugins.title.text = title;
        this.soilChart.update();
    }

    renderTrendList(records) {
        const container = document.getElementById('soilTrendList');
        if (!container) return;

        const visibleRecords = this.trendMode === 'day' ? records : records.slice(-14);
        container.innerHTML = visibleRecords.map(record => {
            const label = record.label || new Date(record.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
            if (record.status === 'no-data') {
                return `
                    <div class="trend-pill no-data">
                        <span>${label}</span>
                        <strong>No data</strong>
                    </div>
                `;
            }
            const statusText = record.status.charAt(0).toUpperCase() + record.status.slice(1);
            return `
                <div class="trend-pill ${record.status}">
                    <span>${label}</span>
                    <strong>${statusText}</strong>
                </div>
            `;
        }).join('');
    }

    updateMetric(elementId, value, unit, statusId, statusFn, isDecimal = false) {
        const element = document.getElementById(elementId);
        const statusElement = document.getElementById(statusId);

        if (element) {
            if (value !== undefined && value !== null) {
                if (isDecimal) {
                    element.textContent = value.toFixed(1) + unit;
                } else {
                    element.textContent = Math.round(value) + unit;
                }
            } else {
                element.textContent = '--' + unit;
            }
        }

        if (statusElement && value !== undefined && value !== null) {
            const status = statusFn(value);
            statusElement.textContent = status.text;
            statusElement.className = `stat-change ${status.class}`;
        } else if (statusElement) {
            statusElement.textContent = 'No Data';
            statusElement.className = 'stat-change warning';
        }
    }

    clearDisplay() {
        const metrics = ['soil-moisture', 'soil-ph', 'soil-temperature', 'soil-ec', 'soil-nitrogen', 'soil-phosphorus', 'soil-potassium'];
        const statuses = ['moisture-change', 'ph-status', 'temp-change', 'ec-status', 'nitrogen-status', 'phosphorus-status', 'potassium-status'];

        metrics.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '--';
        });

        statuses.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = 'No Data';
                el.className = 'stat-change warning';
            }
        });
        this.updateFarmStatus();
        this.updateTrendDisplay();
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return 'Never';

        const now = Date.now();
        const diff = now - timestamp;

        if (diff > 86400000) {
            return 'Just now';
        }

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }
}

// Initialize soil dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.soilDashboard = new SoilDashboard();
});
