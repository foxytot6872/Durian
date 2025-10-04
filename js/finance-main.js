// Finance Dashboard JavaScript - Matching Image Design

// Financial Data Manager
class FinancialDataManager {
    constructor() {
        this.charts = new Map();
        this.init();
    }

    init() {
        this.initCharts();
    }

    initCharts() {
        this.initDailyExpensesChart();
        this.initExpenseBreakdownChart();
        this.initMonthlyExpensesChart();
    }

    // Daily Expenses Chart (Bar Chart)
    initDailyExpensesChart() {
        const ctx = document.getElementById('dailyExpensesChart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Daily Expenses',
                    data: [1200, 1500, 1800, 2200, 1600, 1400, 1100],
                    backgroundColor: '#8b5cf6',
                    borderColor: '#8b5cf6',
                    borderWidth: 0,
                    borderRadius: 4,
                    borderSkipped: false,
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
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#6b7280',
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: '#e5e7eb',
                            drawBorder: false,
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#6b7280',
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });

        this.charts.set('dailyExpenses', chart);
    }

    // Expense Breakdown Chart (Donut Chart)
    initExpenseBreakdownChart() {
        const ctx = document.getElementById('expenseBreakdownChart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Electricity bill', 'Water bill', 'Fertilizer'],
                datasets: [{
                    data: [35, 25, 40],
                    backgroundColor: [
                        '#fbbf24',  // Yellow for electricity
                        '#06b6d4',  // Cyan for water
                        '#8b5cf6'   // Purple for fertilizer
                    ],
                    borderColor: [
                        '#fbbf24',
                        '#06b6d4',
                        '#8b5cf6'
                    ],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                },
                elements: {
                    arc: {
                        borderWidth: 0
                    }
                }
            }
        });

        // Add center text
        const centerText = document.createElement('div');
        centerText.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            pointer-events: none;
        `;
        centerText.innerHTML = `
            <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Total Value</div>
            <div style="color: #9ca3af; font-size: 24px; font-weight: 600;">72</div>
        `;
        
        const chartContainer = ctx.parentElement;
        chartContainer.style.position = 'relative';
        chartContainer.appendChild(centerText);

        this.charts.set('expenseBreakdown', chart);
    }

    // Monthly Expenses Chart (Bar Chart with Income/Expense pairs)
    initMonthlyExpensesChart() {
        const ctx = document.getElementById('monthlyExpensesChart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL'],
                datasets: [
                    {
                        label: 'INCOME',
                        data: [15000, 18000, 22000, 19000, 25000, 35000, 28000],
                        backgroundColor: '#4ba252',
                        borderColor: '#4ba252',
                        borderWidth: 0,
                        borderRadius: 4,
                        borderSkipped: false,
                    },
                    {
                        label: 'EXPENSE',
                        data: [12000, 15000, 18000, 16000, 20000, 22000, 19000],
                        backgroundColor: '#ef4444',
                        borderColor: '#ef4444',
                        borderWidth: 0,
                        borderRadius: 4,
                        borderSkipped: false,
                    }
                ]
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
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#6b7280',
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: '#e5e7eb',
                            drawBorder: false,
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#6b7280',
                            font: {
                                size: 12
                            },
                            callback: function(value) {
                                return value + 'K';
                            }
                        }
                    }
                }
            }
        });

        this.charts.set('monthlyExpenses', chart);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FinancialDataManager();
});