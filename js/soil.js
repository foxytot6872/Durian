// Soil Analysis Page JavaScript - Uses Firebase Dashboard Manager
class SoilDashboard {
    constructor() {
        this.selectedZone = null;
        this.firebaseDashboard = null;
        this.zones = [];
        this.soilChart = null;
        this.trendMode = 'day';
        this.trendZone = 'overall';
        this.trendMetric = 'overview';
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
        const zoneSelect = document.getElementById('soilTrendZone');
        if (zoneSelect) {
            zoneSelect.addEventListener('change', (event) => {
                this.trendZone = event.target.value || 'overall';
                this.renderTrendZoneSelect();
                this.updateTrendDisplay();
            });
        }

        const select = document.getElementById('soilTrendMode');
        if (select) {
            select.addEventListener('change', (event) => {
                this.trendMode = event.target.value;
                this.updateTrendDisplay();
            });
        }

        const metricSelect = document.getElementById('soilTrendMetric');
        if (metricSelect) {
            metricSelect.addEventListener('change', (event) => {
                this.trendMetric = event.target.value;
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
        this.renderTrendZoneSelect();

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

    renderTrendZoneSelect() {
        const select = document.getElementById('soilTrendZone');
        if (!select) return;

        if (this.zones.length === 0) {
            select.innerHTML = '<option value="">No zones</option>';
            select.disabled = true;
            return;
        }

        select.disabled = false;
        const options = [
            `<option value="overall"${this.trendZone === 'overall' ? ' selected' : ''}>Overall</option>`,
            ...this.zones.map(zone => {
                const selected = this.trendZone === zone ? ' selected' : '';
                return `<option value="${zone}"${selected}>${zone}</option>`;
            })
        ];
        select.innerHTML = options.join('');
    }

    selectZone(zone) {
        this.selectedZone = zone;
        this.renderZoneButtons();
        this.renderTrendZoneSelect();
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

        const zone = this.trendZone === 'overall' ? null : this.trendZone;
        const titleZone = zone || 'Overall';
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
            if (!zone) records = this.summarizeOverallHourly(records);
            labels = records.map(record => {
                const date = new Date(record.timestamp);
                return `${String(date.getHours()).padStart(2, '0')}:00`;
            });
            title = 'Day';
        }

        this.renderTrendChart(labels, records, `${titleZone} - ${title}`);
        this.renderTrendList(records);
    }

    summarizeOverallHourly(records) {
        const grouped = new Map();
        records.forEach(record => {
            if (!grouped.has(record.timestamp)) grouped.set(record.timestamp, []);
            grouped.get(record.timestamp).push(record);
        });

        return Array.from(grouped.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([timestamp, group]) => this.summarizeTrendRecords(Number(timestamp), group));
    }

    summarizeTrendRecords(timestamp, records) {
        const average = (key, digits = 1) => {
            const values = records.map(record => Number(record[key])).filter(Number.isFinite);
            if (!values.length) return null;
            const factor = 10 ** digits;
            return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * factor) / factor;
        };
        const score = average('score', 0);

        return {
            timestamp,
            moisture: average('moisture', 0),
            temperature: average('temperature', 1),
            ph: average('ph', 1),
            ec: average('ec', 0),
            n: average('n', 0),
            p: average('p', 0),
            k: average('k', 0),
            score,
            status: this.statusFromScore(score)
        };
    }

    statusFromScore(score) {
        if (score === null || score === undefined) return 'no-data';
        if (score >= 78) return 'healthy';
        if (score >= 55) return 'risky';
        if (score >= 32) return 'danger';
        return 'extreme';
    }

    renderTrendChart(labels, records, title) {
        const canvas = document.getElementById('soilChart');
        if (!canvas || typeof Chart === 'undefined') return;

        const chartData = this.buildTrendChartData(labels, records);
        const scales = this.buildTrendScales();

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
                    scales
                }
            });
            return;
        }

        this.soilChart.data = chartData;
        this.soilChart.options.plugins.title.text = title;
        this.soilChart.options.scales = scales;
        this.soilChart.update();
    }

    buildTrendChartData(labels, records) {
        const datasetsByMetric = {
            overview: [
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
            ],
            moisture: [
                {
                    label: 'Moisture %',
                    data: records.map(record => record.moisture),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.14)',
                    fill: true,
                    tension: 0.35,
                    yAxisID: 'percent'
                }
            ],
            ph: [
                {
                    label: 'pH',
                    data: records.map(record => record.ph),
                    borderColor: '#9333ea',
                    backgroundColor: 'rgba(147, 51, 234, 0.12)',
                    fill: true,
                    tension: 0.35,
                    yAxisID: 'ph'
                }
            ],
            ec: [
                {
                    label: 'EC µS/cm',
                    data: records.map(record => record.ec),
                    borderColor: '#0891b2',
                    backgroundColor: 'rgba(8, 145, 178, 0.12)',
                    fill: true,
                    tension: 0.35,
                    yAxisID: 'ec'
                }
            ],
            nutrients: [
                {
                    label: 'Nitrogen',
                    data: records.map(record => record.n),
                    borderColor: '#16a34a',
                    backgroundColor: 'rgba(22, 163, 74, 0.08)',
                    tension: 0.35,
                    yAxisID: 'nutrients'
                },
                {
                    label: 'Phosphorus',
                    data: records.map(record => record.p),
                    borderColor: '#ca8a04',
                    backgroundColor: 'rgba(202, 138, 4, 0.08)',
                    tension: 0.35,
                    yAxisID: 'nutrients'
                },
                {
                    label: 'Potassium',
                    data: records.map(record => record.k),
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.08)',
                    tension: 0.35,
                    yAxisID: 'nutrients'
                }
            ]
        };

        return {
            labels,
            datasets: datasetsByMetric[this.trendMetric] || datasetsByMetric.overview
        };
    }

    buildTrendScales() {
        if (this.trendMetric === 'moisture') {
            return {
                percent: {
                    type: 'linear',
                    position: 'left',
                    min: 0,
                    max: 100
                }
            };
        }

        if (this.trendMetric === 'ph') {
            return {
                ph: {
                    type: 'linear',
                    position: 'left',
                    min: 4,
                    max: 9
                }
            };
        }

        if (this.trendMetric === 'ec') {
            return {
                ec: {
                    type: 'linear',
                    position: 'left',
                    beginAtZero: true
                }
            };
        }

        if (this.trendMetric === 'nutrients') {
            return {
                nutrients: {
                    type: 'linear',
                    position: 'left',
                    beginAtZero: true
                }
            };
        }

        return {
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
        };
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
