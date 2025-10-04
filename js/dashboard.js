// Farm Dashboard JavaScript - Handles all farm monitoring functionality
class FarmDashboard {
    constructor() {
        this.init();
    }

    init() {
        this.populateAlerts();
        this.populateActivities();
        this.initFarmCharts();
        this.setupRealTimeUpdates();
    }

    populateAlerts() {
        const alertsData = [
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
        const activitiesData = [
            {
                activity: 'Watering',
                location: 'Zone A',
                duration: '2 hours',
                status: 'Completed',
                time: '1 hour ago'
            },
            {
                activity: 'Fertilizing',
                location: 'Zone B',
                duration: '1.5 hours',
                status: 'In Progress',
                time: '30 min ago'
            },
            {
                activity: 'Pruning',
                location: 'Zone D',
                duration: '3 hours',
                status: 'Completed',
                time: '3 hours ago'
            },
            {
                activity: 'Soil Testing',
                location: 'Zone C',
                duration: '1 hour',
                status: 'Scheduled',
                time: 'Tomorrow'
            }
        ];

        const tbody = document.getElementById('activitiesTableBody');
        if (tbody) {
            tbody.innerHTML = activitiesData.map(activity => `
                <tr>
                    <td>${activity.activity}</td>
                    <td>${activity.location}</td>
                    <td>${activity.duration}</td>
                    <td><span class="status-badge ${activity.status.toLowerCase().replace(' ', '-')}">${activity.status}</span></td>
                    <td>${activity.time}</td>
                </tr>
            `).join('');
        }
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
        // Simulate real-time updates every 30 seconds
        setInterval(() => {
            this.updateFarmMetrics();
        }, 30000);
    }

    updateFarmMetrics() {
        // Update stat cards with new values
        const metrics = {
            soilMoisture: Math.floor(Math.random() * 20) + 60,
            temperature: Math.floor(Math.random() * 8) + 25,
            humidity: Math.floor(Math.random() * 15) + 70,
            plantHealth: Math.floor(Math.random() * 10) + 85
        };

        // Update the display (simplified for demo)
        console.log('Updating farm metrics:', metrics);
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