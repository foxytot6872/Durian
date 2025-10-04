// Main Dashboard Application - Modular version



class Dashboard {
    constructor() {
        this.charts = null;
        this.orders = CONFIG.DEFAULT_DATA.ORDERS;
        this.products = CONFIG.DEFAULT_DATA.PRODUCTS;
        
        this.init();
    }

    // Initialize the dashboard
    init() {
        this.initializeCharts();
        this.initializeEventListeners();
        this.loadDashboardData();
    }

    // Initialize chart components
    initializeCharts() {
        this.charts = new ChartsComponent();
        this.charts.initCharts();
    }

    // Initialize event listeners
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
                e.preventDefault();
                
                // Remove active class from all links
                navLinks.forEach(l => l.parentElement.classList.remove('active'));
                
                // Add active class to clicked link
                link.parentElement.classList.add('active');
                
                // Close mobile menu
                sidebar.classList.remove('open');
            });
        });

        // Chart period selector
        const chartSelect = document.querySelector('.chart-controls select');
        if (chartSelect) {
            chartSelect.addEventListener('change', (e) => {
                this.charts.updateChartData(e.target.value);
            });
        }

        // Search functionality
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) {
            const debouncedSearch = Helpers.debounce((query) => {
                this.handleSearch(query);
            }, 300);
            
            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });
        }
    }

    // Load dashboard data
    loadDashboardData() {
        this.populateOrdersTable();
        this.populateProductsTable();
        this.animateStats();
    }

    // Populate orders table
    populateOrdersTable() {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.orders.map(order => `
            <tr>
                <td>${order.id}</td>
                <td>${order.customer}</td>
                <td>${order.product}</td>
                <td>${Helpers.formatCurrency(order.amount)}</td>
                <td><span class="status-badge ${order.status}">${order.status}</span></td>
                <td>${new Date(order.date).toLocaleDateString()}</td>
            </tr>
        `).join('');
    }

    // Populate products table
    populateProductsTable() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.products.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${Helpers.formatNumber(product.sales)}</td>
                <td>${Helpers.formatCurrency(product.revenue)}</td>
                <td><span class="stat-change ${product.growth >= 0 ? 'positive' : 'negative'}">${Helpers.formatPercentage(product.growth)}</span></td>
            </tr>
        `).join('');
    }

    // Animate statistics
    animateStats() {
        const statValues = document.querySelectorAll('.stat-content h3');
        
        statValues.forEach((element) => {
            const targetValue = element.textContent;
            if (!targetValue) return;

            // Extract numeric value
            const numericValue = parseFloat(targetValue.replace(/[^0-9.-]/g, ''));
            if (isNaN(numericValue)) return;

            // Animate the number
            Helpers.animateNumber(element, numericValue, CONFIG.ANIMATION.CHART_ANIMATION_DURATION);
        });
    }

    // Handle search functionality
    handleSearch(query) {
        if (!query.trim()) {
            this.loadDashboardData();
            return;
        }

        // Filter orders
        const filteredOrders = this.orders.filter(order => 
            order.customer.toLowerCase().includes(query.toLowerCase()) ||
            order.product.toLowerCase().includes(query.toLowerCase()) ||
            order.id.toLowerCase().includes(query.toLowerCase())
        );

        // Filter products
        const filteredProducts = this.products.filter(product => 
            product.name.toLowerCase().includes(query.toLowerCase())
        );

        // Update tables with filtered data
        this.updateOrdersTable(filteredOrders);
        this.updateProductsTable(filteredProducts);
    }

    // Update orders table with filtered data
    updateOrdersTable(orders) {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;

        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>${order.id}</td>
                <td>${order.customer}</td>
                <td>${order.product}</td>
                <td>${Helpers.formatCurrency(order.amount)}</td>
                <td><span class="status-badge ${order.status}">${order.status}</span></td>
                <td>${new Date(order.date).toLocaleDateString()}</td>
            </tr>
        `).join('');
    }

    // Update products table with filtered data
    updateProductsTable(products) {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        tbody.innerHTML = products.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${Helpers.formatNumber(product.sales)}</td>
                <td>${Helpers.formatCurrency(product.revenue)}</td>
                <td><span class="stat-change ${product.growth >= 0 ? 'positive' : 'negative'}">${Helpers.formatPercentage(product.growth)}</span></td>
            </tr>
        `).join('');
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
    // Load utility modules first
    const script1 = document.createElement('script');
    script1.src = 'js/utils/constants.js';
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'js/utils/helpers.js';
    document.head.appendChild(script2);

    const script3 = document.createElement('script');
    script3.src = 'js/components/charts.js';
    document.head.appendChild(script3);

    // Initialize dashboard after modules are loaded
    setTimeout(() => {
        const dashboard = new Dashboard();
        window.dashboard = dashboard;
    }, 100);
});
