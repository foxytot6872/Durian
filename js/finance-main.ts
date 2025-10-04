// Finance Page TypeScript

// Financial data interfaces
interface FinancialData {
    totalRevenue: number;
    averagePrice: number;
    totalSales: number;
    expenses: number;
    profit: number;
}

interface Transaction {
    id: string;
    date: string;
    type: 'Sale' | 'Expense' | 'Investment';
    amount: number;
    status: 'Completed' | 'Pending' | 'Cancelled';
    description: string;
}

interface MonthlySummary {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
}

// Financial data management
class FinancialDataManager {
    private financialData: FinancialData;
    private transactions: Transaction[];
    private monthlySummaries: MonthlySummary[];
    
    constructor() {
        this.financialData = this.getDefaultFinancialData();
        this.transactions = this.getDefaultTransactions();
        this.monthlySummaries = this.getDefaultMonthlySummaries();
        this.init();
    }
    
    private init(): void {
        this.updateFinancialDisplay();
        this.updateTransactionsTable();
        this.updateMonthlySummaryTable();
    }
    
    private getDefaultFinancialData(): FinancialData {
        return {
            totalRevenue: 125000,
            averagePrice: 85,
            totalSales: 1470,
            expenses: 45000,
            profit: 80000
        };
    }
    
    private getDefaultTransactions(): Transaction[] {
        return [
            {
                id: 'TXN-001',
                date: '2024-01-15',
                type: 'Sale',
                amount: 15000,
                status: 'Completed',
                description: 'Durian Sale - Field A-01'
            },
            {
                id: 'TXN-002',
                date: '2024-01-14',
                type: 'Expense',
                amount: -2500,
                status: 'Pending',
                description: 'Fertilizer Purchase'
            },
            {
                id: 'TXN-003',
                date: '2024-01-13',
                type: 'Sale',
                amount: 12000,
                status: 'Completed',
                description: 'Durian Sale - Field B-01'
            }
        ];
    }
    
    private getDefaultMonthlySummaries(): MonthlySummary[] {
        return [
            {
                month: 'January 2024',
                revenue: 125000,
                expenses: 45000,
                profit: 80000
            },
            {
                month: 'December 2023',
                revenue: 98000,
                expenses: 42000,
                profit: 56000
            }
        ];
    }
    
    private updateFinancialDisplay(): void {
        // Update revenue display
        const revenueElement = document.querySelector('[data-stat="revenue"]');
        if (revenueElement) {
            revenueElement.textContent = `฿${this.financialData.totalRevenue.toLocaleString()}`;
        }
        
        // Update average price display
        const priceElement = document.querySelector('[data-stat="price"]');
        if (priceElement) {
            priceElement.textContent = `฿${this.financialData.averagePrice}/kg`;
        }
        
        // Update sales display
        const salesElement = document.querySelector('[data-stat="sales"]');
        if (salesElement) {
            salesElement.textContent = `${this.financialData.totalSales.toLocaleString()} kg`;
        }
        
        // Update expenses display
        const expensesElement = document.querySelector('[data-stat="expenses"]');
        if (expensesElement) {
            expensesElement.textContent = `฿${this.financialData.expenses.toLocaleString()}`;
        }
    }
    
    private updateTransactionsTable(): void {
        const tableBody = document.getElementById('transactionsTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = this.transactions.map(transaction => `
            <tr>
                <td>${transaction.date}</td>
                <td>${transaction.type}</td>
                <td>฿${Math.abs(transaction.amount).toLocaleString()}</td>
                <td><span class="transaction-status ${transaction.status.toLowerCase()}">${transaction.status}</span></td>
            </tr>
        `).join('');
    }
    
    private updateMonthlySummaryTable(): void {
        const tableBody = document.getElementById('monthlySummaryTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = this.monthlySummaries.map(summary => `
            <tr>
                <td>${summary.month}</td>
                <td>฿${summary.revenue.toLocaleString()}</td>
                <td>฿${summary.expenses.toLocaleString()}</td>
                <td>฿${summary.profit.toLocaleString()}</td>
            </tr>
        `).join('');
    }
}

// Financial charts management
class FinancialChartManager {
    private charts: Map<string, any> = new Map();
    
    constructor() {
        this.initCharts();
    }
    
    private initCharts(): void {
        this.initRevenueChart();
        this.initProfitChart();
    }
    
    private initRevenueChart(): void {
        const ctx = document.getElementById('revenueChart') as HTMLCanvasElement;
        if (!ctx) return;
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Revenue',
                    data: [25000, 30000, 35000, 35000],
                    borderColor: '#4ba252',
                    backgroundColor: 'rgba(75, 162, 82, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
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
                            color: '#f1f5f9'
                        },
                        ticks: {
                            color: '#64748b'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#64748b'
                        }
                    }
                }
            }
        });
        
        this.charts.set('revenue', chart);
    }
    
    private initProfitChart(): void {
        const ctx = document.getElementById('profitChart') as HTMLCanvasElement;
        if (!ctx) return;
        
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Revenue', 'Expenses'],
                datasets: [{
                    data: [125000, 45000],
                    backgroundColor: ['#4ba252', '#ef4444'],
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
                            color: '#64748b',
                            padding: 20
                        }
                    }
                }
            }
        });
        
        this.charts.set('profit', chart);
    }
}

// Navigation management (shared)
class NavigationManager {
    private navLinks: NodeListOf<HTMLAnchorElement>;
    
    constructor() {
        this.navLinks = document.querySelectorAll('.nav-link');
        this.init();
    }
    
    private init(): void {
        this.setupEventListeners();
        this.debugNavigation();
    }
    
    private setupEventListeners(): void {
        this.navLinks.forEach((link) => {
            link.addEventListener('click', (e) => this.handleNavigation(e, link));
        });
    }
    
    private handleNavigation(event: Event, link: HTMLAnchorElement): void {
        console.log('Link clicked:', link.href);
        
        if (link.href && link.href !== '#' && !link.href.includes('#')) {
            console.log('Navigating to:', link.href);
            window.location.href = link.href;
        } else {
            console.log('Invalid or hash link:', link.href);
        }
    }
    
    private debugNavigation(): void {
        console.log('Found', this.navLinks.length, 'navigation links');
        
        this.navLinks.forEach((link, index) => {
            console.log(`Link ${index}:`, link.href, link.textContent?.trim());
        });
    }
}

// Mobile menu management (shared)
class MobileMenuManager {
    private menuToggle: HTMLButtonElement | null;
    private sidebar: HTMLElement | null;
    
    constructor() {
        this.menuToggle = document.querySelector('.menu-toggle');
        this.sidebar = document.querySelector('.sidebar');
        this.init();
    }
    
    private init(): void {
        if (this.menuToggle && this.sidebar) {
            this.menuToggle.addEventListener('click', () => this.toggleSidebar());
        }
    }
    
    private toggleSidebar(): void {
        if (this.sidebar) {
            this.sidebar.classList.toggle('open');
        }
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NavigationManager();
    new MobileMenuManager();
    new FinancialDataManager();
    new FinancialChartManager();
});
