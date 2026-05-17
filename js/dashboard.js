// Farm Dashboard JavaScript - Handles all farm monitoring functionality
class FarmDashboard {
    constructor() {
        this.wateringLogsKey = 'durianZoneWateringLogsV3';
        this.init();
    }

    init() {
        this.populateAlerts();
        this.populateActivities();
        this.initFarmCharts();
        this.setupRealTimeUpdates();
    }

    populateAlerts() {
        const virtualAlerts = window.VirtualSensorData ? window.VirtualSensorData.getAlerts() : [];
        const alertsData = virtualAlerts.length ? virtualAlerts : [
            {
                type: 'Soil Moisture',
                description: 'Zone C soil moisture below optimal level',
                priority: 'High',
                time: '2 hours ago',
                status: 'Active'
            },
            {
                type: 'Temperature',
                description: 'High temperature detected in Zone C',
                priority: 'Medium',
                time: '4 hours ago',
                status: 'Monitoring'
            },
            {
                type: 'Irrigation',
                description: 'Irrigation system maintenance due',
                priority: 'Low',
                time: '1 day ago',
                status: 'Scheduled'
            },
            {
                type: 'Pest Control',
                description: 'Routine pest inspection completed',
                priority: 'Low',
                time: '2 days ago',
                status: 'Completed'
            }
        ];

        const tbody = document.getElementById('alertsTableBody');
        if (tbody) {
            tbody.innerHTML = alertsData.map(alert => `
                <tr>
                    <td><span class="alert-type">${alert.type}</span></td>
                    <td>${alert.description}</td>
                    <td><span class="priority-${alert.priority.toLowerCase()}">${alert.priority}</span></td>
                    <td>${alert.time}</td>
                    <td><span class="status-badge ${alert.status.toLowerCase()}">${alert.status}</span></td>
                </tr>
            `).join('');
        }
    }

    populateActivities() {
        const tbody = document.getElementById('activitiesTableBody');
        if (!tbody) return;

        const logs = this.getLocalWateringLogs();
        this.renderWateringActivities(logs);
        this.loadFirebaseWateringLogs();
    }

    getLocalWateringLogs() {
        try {
            const logs = JSON.parse(localStorage.getItem(this.wateringLogsKey) || '[]');
            return this.completeExpiredWateringLogs(logs);
        } catch (error) {
            console.warn('Could not read watering logs', error);
            return [];
        }
    }

    completeExpiredWateringLogs(logs) {
        let changed = false;
        const normalized = logs.map(log => {
            if (log?.status === 'watering' && log.endsAt && new Date(log.endsAt).getTime() <= Date.now()) {
                changed = true;
                return {
                    ...log,
                    status: 'completed',
                    completedAt: log.endsAt
                };
            }
            return log;
        });

        if (changed) {
            localStorage.setItem(this.wateringLogsKey, JSON.stringify(normalized.slice(0, 80)));
        }

        return normalized;
    }

    renderWateringActivities(logs) {
        const tbody = document.getElementById('activitiesTableBody');
        if (!tbody) return;

        const sortedLogs = [...logs]
            .filter(log => log && log.zone)
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 7);

        if (!sortedLogs.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 1.5rem; color: #718096;">
                        No watering logs yet
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sortedLogs.map(log => {
            const duration = Number(log.duration || 0);
            const waterAmount = log.waterAmountLiters ? `, ${log.waterAmountLiters} L` : '';
            const isWatering = log.status === 'watering' && (!log.endsAt || new Date(log.endsAt).getTime() > Date.now());
            const status = log.status === 'cancelled'
                ? 'Cancelled'
                : log.status === 'paused'
                    ? 'Paused'
                    : isWatering
                        ? 'Watering'
                        : 'Completed';
            const statusClass = ['cancelled', 'paused'].includes(log.status)
                ? log.status
                : isWatering ? 'in-progress' : 'completed';
            return `
                <tr>
                    <td>Watering</td>
                    <td>Zone ${log.zone}</td>
                    <td>${duration} min${waterAmount}</td>
                    <td><span class="status-badge ${statusClass}">${status}</span></td>
                    <td>${this.formatRelativeTime(log.createdAt)}</td>
                </tr>
            `;
        }).join('');
    }

    async loadFirebaseWateringLogs(retry = 0) {
        const dashboard = window.firebaseDashboard;
        if (!dashboard?.currentUser || !dashboard?.idToken) {
            if (retry < 20) {
                setTimeout(() => this.loadFirebaseWateringLogs(retry + 1), 500);
            }
            return;
        }

        try {
            const dbUrl = 'https://testing-151e6-default-rtdb.asia-southeast1.firebasedatabase.app';
            const response = await fetch(`${dbUrl}/users/${dashboard.currentUser.uid}/watering_logs.json?auth=${dashboard.idToken}`);
            const firebaseLogs = await response.json();
            const merged = this.completeExpiredWateringLogs(
                this.mergeLogsById(this.getLocalWateringLogs(), Object.values(firebaseLogs || {}))
            );
            localStorage.setItem(this.wateringLogsKey, JSON.stringify(merged.slice(0, 80)));
            this.renderWateringActivities(merged);
        } catch (error) {
            console.warn('Could not load watering logs from Firebase', error);
        }
    }

    mergeLogsById(localLogs, firebaseLogs) {
        const logsById = new Map();
        [...localLogs, ...firebaseLogs].forEach(log => {
            if (log?.id) logsById.set(log.id, log);
        });
        return [...logsById.values()].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    formatRelativeTime(value) {
        if (!value) return 'No time';

        const diffMs = Date.now() - new Date(value).getTime();
        if (!Number.isFinite(diffMs)) return 'No time';

        const minutes = Math.floor(diffMs / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} min ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

        const days = Math.floor(hours / 24);
        return `${days} day${days === 1 ? '' : 's'} ago`;
    }

    initFarmCharts() {
        // Weather Chart
        const weatherCtx = document.getElementById('weatherChart');
        if (weatherCtx) {
            new Chart(weatherCtx, {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Temperature (°C)',
                        data: [28, 30, 27, 32, 29, 26, 28],
                        borderColor: '#ff6b6b',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        yAxisID: 'y'
                    }, {
                        label: 'Humidity (%)',
                        data: [75, 70, 80, 65, 72, 78, 74],
                        borderColor: '#4ecdc4',
                        backgroundColor: 'rgba(78, 205, 196, 0.1)',
                        yAxisID: 'y1'
                    }, {
                        label: 'Soil Moisture (%)',
                        data: [65, 68, 62, 45, 70, 72, 68],
                        borderColor: '#45b7d1',
                        backgroundColor: 'rgba(69, 183, 209, 0.1)',
                        yAxisID: 'y1'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Temperature (°C)'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Humidity & Moisture (%)'
                            },
                            grid: {
                                drawOnChartArea: false,
                            },
                        }
                    }
                }
            });
        }

        // Growth Chart
        const growthCtx = document.getElementById('growthChart');
        if (growthCtx) {
            new Chart(growthCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Flowering', 'Fruiting', 'Mature', 'Harvest Ready'],
                    datasets: [{
                        data: [25, 35, 30, 10],
                        backgroundColor: [
                            '#ff9ff3',
                            '#54a0ff',
                            '#5f27cd',
                            '#00d2d3'
                        ],
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
                                padding: 20,
                                usePointStyle: true
                            }
                        }
                    }
                }
            });
        }
    }

    setupRealTimeUpdates() {
        // Real-time updates are now handled by Firebase Dashboard Manager
        // This method is kept for compatibility but Firebase handles updates
        console.log('📊 Real-time updates handled by Firebase Dashboard Manager');

        // Check if Firebase Dashboard Manager is available
        if (window.firebaseDashboard) {
            console.log('✅ Firebase Dashboard Manager connected');
            window.firebaseDashboard.onUpdate(() => this.populateAlerts());
        } else {
            console.log('⏳ Waiting for Firebase Dashboard Manager...');
            // Retry after a delay
            setTimeout(() => {
                if (window.firebaseDashboard) {
                    console.log('✅ Firebase Dashboard Manager now available');
                    window.firebaseDashboard.onUpdate(() => this.populateAlerts());
                    this.populateAlerts();
                }
            }, 2000);
        }
    }

    updateFarmMetrics() {
        // Metrics are now updated by Firebase Dashboard Manager
        // This method is kept for compatibility
        if (window.firebaseDashboard) {
            const devices = window.firebaseDashboard.getDevices();
            console.log('📊 Current devices:', devices.length);
        }
    }

    // Method to update weather chart based on period selection
    updateWeatherChart(period) {
        const weatherCtx = document.getElementById('weatherChart');
        if (!weatherCtx) return;

        let newData = {
            temperature: [],
            humidity: [],
            soilMoisture: []
        };
        let newLabels = [];

        switch (period) {
            case 'Last 7 days':
                newLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                newData.temperature = [28, 30, 27, 32, 29, 26, 28];
                newData.humidity = [75, 70, 80, 65, 72, 78, 74];
                newData.soilMoisture = [65, 68, 62, 45, 70, 72, 68];
                break;
            case 'Last 30 days':
                newLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                newData.temperature = [29, 31, 28, 30];
                newData.humidity = [72, 68, 75, 70];
                newData.soilMoisture = [67, 63, 70, 65];
                break;
            case 'Last 3 months':
                newLabels = ['Month 1', 'Month 2', 'Month 3'];
                newData.temperature = [30, 28, 29];
                newData.humidity = [70, 75, 72];
                newData.soilMoisture = [65, 70, 67];
                break;
            default:
                return;
        }

        // Update the chart if it exists
        const chart = Chart.getChart(weatherCtx);
        if (chart) {
            chart.data.labels = newLabels;
            chart.data.datasets[0].data = newData.temperature;
            chart.data.datasets[1].data = newData.humidity;
            chart.data.datasets[2].data = newData.soilMoisture;
            chart.update();
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const farmDashboard = new FarmDashboard();

    // Add event listener for weather period selection
    const weatherPeriodSelect = document.getElementById('weatherPeriod');
    if (weatherPeriodSelect) {
        weatherPeriodSelect.addEventListener('change', (e) => {
            farmDashboard.updateWeatherChart(e.target.value);
        });
    }
});
