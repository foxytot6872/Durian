// Finance Page JavaScript - Handles financial dashboard functionality
class FinanceDashboard {
    constructor() {
        this.financialData = null;
        this.charts = {};
        this.init();
    }

    init() {
        this.loadFinancialData();
        this.initializeCharts();
        this.setupEventListeners();
        this.updateFinancialDisplay();
    }

    loadFinancialData() {
        // Simulate financial data loading
        this.financialData = {
            summary: {
                totalRevenue: 125000,
                totalExpenses: 85000,
                netProfit: 40000,
                profitMargin: 32.0,
                monthlyGrowth: 12.5
            },
            revenue: {
                monthly: [8500, 9200, 8800, 10500, 11200, 10800, 12500, 13200, 12800, 14500, 15200, 14800],
                categories: {
                    'Durian Sales': 75000,
                    'Farm Tours': 25000,
                    'Consulting': 15000,
                    'Other': 10000
                }
            },
            expenses: {
                monthly: [6500, 7200, 6800, 7500, 8200, 7800, 8500, 9200, 8800, 9500, 10200, 9800],
                categories: {
                    'Labor': 30000,
                    'Equipment': 20000,
                    'Supplies': 15000,
                    'Utilities': 10000,
                    'Other': 10000
                }
            },
            transactions: [
                { id: 'TXN001', date: '2024-01-15', description: 'Durian Sales - Premium Grade', amount: 5000, type: 'revenue', category: 'Sales' },
                { id: 'TXN002', date: '2024-01-14', description: 'Equipment Maintenance', amount: -1200, type: 'expense', category: 'Maintenance' },
                { id: 'TXN003', date: '2024-01-13', description: 'Farm Tour Group', amount: 800, type: 'revenue', category: 'Tours' },
                { id: 'TXN004', date: '2024-01-12', description: 'Fertilizer Purchase', amount: -500, type: 'expense', category: 'Supplies' },
                { id: 'TXN005', date: '2024-01-11', description: 'Consulting Services', amount: 1500, type: 'revenue', category: 'Consulting' }
            ]
        };
    }

    updateFinancialDisplay() {
        this.updateSummaryCards();
        this.updateTransactionsTable();
        this.updateRevenueBreakdown();
        this.updateExpenseBreakdown();
    }

    updateSummaryCards() {
        const summary = this.financialData.summary;
        
        this.updateCard('.revenue-card .amount', this.formatCurrency(summary.totalRevenue));
        this.updateCard('.expenses-card .amount', this.formatCurrency(summary.totalExpenses));
        this.updateCard('.profit-card .amount', this.formatCurrency(summary.netProfit));
        this.updateCard('.margin-card .amount', `${summary.profitMargin}%`);
        this.updateCard('.growth-card .amount', `+${summary.monthlyGrowth}%`);
    }

    updateCard(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }

    updateTransactionsTable() {
        const tbody = document.getElementById('transactionsTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.financialData.transactions.map(transaction => `
            <tr>
                <td>${transaction.id}</td>
                <td>${new Date(transaction.date).toLocaleDateString()}</td>
                <td>${transaction.description}</td>
                <td>${transaction.category}</td>
                <td class="${transaction.type === 'revenue' ? 'positive' : 'negative'}">
                    ${transaction.type === 'revenue' ? '+' : ''}${this.formatCurrency(Math.abs(transaction.amount))}
                </td>
            </tr>
        `).join('');
    }

    updateRevenueBreakdown() {
        const container = document.querySelector('.revenue-breakdown');
        if (!container) return;

        container.innerHTML = Object.entries(this.financialData.revenue.categories).map(([category, amount]) => `
            <div class="breakdown-item">
                <div class="breakdown-label">${category}</div>
                <div class="breakdown-amount">${this.formatCurrency(amount)}</div>
                <div class="breakdown-bar">
                    <div class="breakdown-fill" style="width: ${(amount / this.financialData.summary.totalRevenue) * 100}%"></div>
                </div>
            </div>
        `).join('');
    }

    updateExpenseBreakdown() {
        const container = document.querySelector('.expense-breakdown');
        if (!container) return;

        container.innerHTML = Object.entries(this.financialData.expenses.categories).map(([category, amount]) => `
            <div class="breakdown-item">
                <div class="breakdown-label">${category}</div>
                <div class="breakdown-amount">${this.formatCurrency(amount)}</div>
                <div class="breakdown-bar">
                    <div class="breakdown-fill" style="width: ${(amount / this.financialData.summary.totalExpenses) * 100}%"></div>
                </div>
            </div>
        `).join('');
    }

    initializeCharts() {
        this.createRevenueChart();
        this.createExpenseChart();
        this.createProfitChart();
        this.createCashFlowChart();
    }

    createRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Monthly Revenue',
                    data: this.financialData.revenue.monthly,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    createExpenseChart() {
        const ctx = document.getElementById('expenseChart');
        if (!ctx) return;

        this.charts.expense = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Monthly Expenses',
                    data: this.financialData.expenses.monthly,
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
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    createProfitChart() {
        const ctx = document.getElementById('profitChart');
        if (!ctx) return;

        const profitData = this.financialData.revenue.monthly.map((revenue, index) => 
            revenue - this.financialData.expenses.monthly[index]
        );

        this.charts.profit = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Monthly Profit',
                    data: profitData,
                    backgroundColor: profitData.map(value => value >= 0 ? '#10b981' : '#ef4444'),
                    borderColor: profitData.map(value => value >= 0 ? '#059669' : '#dc2626'),
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
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    createCashFlowChart() {
        const ctx = document.getElementById('cashFlowChart');
        if (!ctx) return;

        this.charts.cashFlow = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(this.financialData.revenue.categories),
                datasets: [{
                    data: Object.values(this.financialData.revenue.categories),
                    backgroundColor: [
                        '#10b981',
                        '#3b82f6',
                        '#8b5cf6',
                        '#f59e0b'
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

    setupEventListeners() {
        // Date range selector
        const dateRangeSelect = document.querySelector('.date-range-select');
        if (dateRangeSelect) {
            dateRangeSelect.addEventListener('change', (e) => {
                this.updateDateRange(e.target.value);
            });
        }

        // Export buttons
        const exportBtn = document.querySelector('.export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        // Add transaction button
        const addTransactionBtn = document.querySelector('.add-transaction-btn');
        if (addTransactionBtn) {
            addTransactionBtn.addEventListener('click', () => {
                this.showAddTransactionModal();
            });
        }
    }

    updateDateRange(range) {
        console.log('Updating date range to:', range);
        // Implement date range filtering
        this.loadFinancialData();
        this.updateFinancialDisplay();
    }

    exportData() {
        console.log('Exporting financial data...');
        // Implement data export functionality
    }

    showAddTransactionModal() {
        console.log('Showing add transaction modal...');
        // Implement add transaction modal
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
}

// Initialize finance dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FinanceDashboard();
});
