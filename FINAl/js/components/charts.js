// Charts Component - Handles all chart-related functionality
class ChartsComponent {
    constructor() {
        this.revenueChart = null;
        this.salesChart = null;
    }

    // Initialize all charts
    initCharts() {
        this.createRevenueChart();
        this.createSalesChart();
    }

    // Create revenue line chart
    createRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        this.revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                datasets: [{
                    label: 'Revenue',
                    data: [12000, 15000, 18000, 14000, 22000, 19000, 25000],
                    borderColor: 'rgb(102, 126, 234)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgb(102, 126, 234)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
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
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                elements: {
                    point: {
                        hoverRadius: 8
                    }
                }
            }
        });
    }

    // Create sales distribution pie chart
    createSalesChart() {
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;

        this.salesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Durian Premium', 'Durian Classic', 'Durian Deluxe', 'Durian Special'],
                datasets: [{
                    data: [35, 30, 20, 15],
                    backgroundColor: [
                        'rgb(102, 126, 234)',
                        'rgb(240, 147, 251)',
                        'rgb(79, 172, 254)',
                        'rgb(67, 233, 123)'
                    ],
                    borderWidth: 0,
                    cutout: '60%'
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
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }

    // Update chart data based on period
    updateChartData(period) {
        if (!this.revenueChart) return;

        let newData = [];
        let newLabels = [];

        switch (period) {
            case 'Last 7 days':
                newLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                newData = [8000, 12000, 15000, 10000, 18000, 14000, 16000];
                break;
            case 'Last 30 days':
                newLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                newData = [45000, 52000, 48000, 61000];
                break;
            case 'Last 3 months':
                newLabels = ['Month 1', 'Month 2', 'Month 3'];
                newData = [180000, 220000, 195000];
                break;
            default:
                return;
        }

        this.revenueChart.data.labels = newLabels;
        this.revenueChart.data.datasets[0].data = newData;
        this.revenueChart.update();
    }
}

// Export for use in other modules
window.ChartsComponent = ChartsComponent;
