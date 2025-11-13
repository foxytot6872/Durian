class Dashboard {
    constructor() {
        this.revenueChart = null;
        this.salesChart = null;
        this.orders = [];
        this.products = [];
        this.initializeData();
        this.initializeCharts();
        this.initializeEventListeners();
        this.loadDashboardData();
    }
    initializeData() {
        // Sample orders data
        this.orders = [
            {
                id: '#ORD-001',
                customer: 'John Smith',
                product: 'Durian Premium',
                amount: 299.99,
                status: 'completed',
                date: '2024-01-15'
            },
            {
                id: '#ORD-002',
                customer: 'Sarah Johnson',
                product: 'Durian Classic',
                amount: 199.99,
                status: 'pending',
                date: '2024-01-14'
            },
            {
                id: '#ORD-003',
                customer: 'Mike Wilson',
                product: 'Durian Deluxe',
                amount: 399.99,
                status: 'completed',
                date: '2024-01-13'
            },
            {
                id: '#ORD-004',
                customer: 'Emily Davis',
                product: 'Durian Premium',
                amount: 299.99,
                status: 'cancelled',
                date: '2024-01-12'
            },
            {
                id: '#ORD-005',
                customer: 'David Brown',
                product: 'Durian Classic',
                amount: 199.99,
                status: 'completed',
                date: '2024-01-11'
            }
        ];
        // Sample products data
        this.products = [
            {
                name: 'Durian Premium',
                sales: 1250,
                revenue: 374987.50,
                growth: 12.5
            },
            {
                name: 'Durian Classic',
                sales: 2100,
                revenue: 419979.00,
                growth: 8.2
            },
            {
                name: 'Durian Deluxe',
                sales: 850,
                revenue: 339991.50,
                growth: 15.3
            },
            {
                name: 'Durian Special',
                sales: 650,
                revenue: 259974.00,
                growth: -2.1
            }
        ];
    }
    initializeCharts() {
        this.createRevenueChart();
        this.createSalesChart();
    }
    createRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx)
            return;
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
                            callback: function (value) {
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
    createSalesChart() {
        const ctx = document.getElementById('salesChart');
        if (!ctx)
            return;
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
    initializeEventListeners() {
        // Mobile menu toggle
        const menuToggle = document.querySelector('.menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }
        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                var _a;
                e.preventDefault();
                // Remove active class from all links
                navLinks.forEach(l => { var _a; return (_a = l.parentElement) === null || _a === void 0 ? void 0 : _a.classList.remove('active'); });
                // Add active class to clicked link
                (_a = link.parentElement) === null || _a === void 0 ? void 0 : _a.classList.add('active');
                // Close mobile menu
                sidebar.classList.remove('open');
            });
        });
        // Chart period selector
        const chartSelect = document.querySelector('.chart-controls select');
        if (chartSelect) {
            chartSelect.addEventListener('change', (e) => {
                const target = e.target;
                this.updateChartData(target.value);
            });
        }
    }
    updateChartData(period) {
        if (!this.revenueChart)
            return;
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
    loadDashboardData() {
        this.populateOrdersTable();
        this.populateProductsTable();
        this.animateStats();
    }
    populateOrdersTable() {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody)
            return;
        tbody.innerHTML = this.orders.map(order => `
            <tr>
                <td>${order.id}</td>
                <td>${order.customer}</td>
                <td>${order.product}</td>
                <td>$${order.amount.toFixed(2)}</td>
                <td><span class="status-badge ${order.status}">${order.status}</span></td>
                <td>${new Date(order.date).toLocaleDateString()}</td>
            </tr>
        `).join('');
    }
    populateProductsTable() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody)
            return;
        tbody.innerHTML = this.products.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${product.sales.toLocaleString()}</td>
                <td>$${product.revenue.toLocaleString()}</td>
                <td><span class="stat-change ${product.growth >= 0 ? 'positive' : 'negative'}">${product.growth >= 0 ? '+' : ''}${product.growth}%</span></td>
            </tr>
        `).join('');
    }
    animateStats() {
        const statValues = document.querySelectorAll('.stat-content h3');
        statValues.forEach((element, index) => {
            const targetValue = element.textContent;
            if (!targetValue)
                return;
            // Extract numeric value
            const numericValue = parseFloat(targetValue.replace(/[^0-9.-]/g, ''));
            if (isNaN(numericValue))
                return;
            // Animate from 0 to target value
            let currentValue = 0;
            const increment = numericValue / 50;
            const timer = setInterval(() => {
                currentValue += increment;
                if (currentValue >= numericValue) {
                    currentValue = numericValue;
                    clearInterval(timer);
                }
                // Format the value based on original format
                if (targetValue.includes('$')) {
                    element.textContent = `$${Math.floor(currentValue).toLocaleString()}`;
                }
                else if (targetValue.includes('%')) {
                    element.textContent = `${currentValue.toFixed(1)}%`;
                }
                else {
                    element.textContent = Math.floor(currentValue).toLocaleString();
                }
            }, 30);
        });
    }
    // Public methods for external use
    refreshData() {
        this.loadDashboardData();
    }
    addOrder(order) {
        this.orders.unshift(order);
        this.populateOrdersTable();
    }
    updateStats() {
        this.animateStats();
    }
}
// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new Dashboard();
    // Make dashboard globally accessible for debugging
    window.dashboard = dashboard;
});
// Utility functions
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}
export function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}
export function formatPercentage(num) {
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
}
// Export the Dashboard class for potential module usage
export { Dashboard };
