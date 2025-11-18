// Recommendations Page JavaScript - Handles farm recommendations functionality
class RecommendationsDashboard {
    constructor() {
        this.recommendations = [];
        this.weatherData = null;
        this.soilData = null;
        this.init();
    }

    init() {
        this.loadData();
        this.generateRecommendations();
        this.setupEventListeners();
        this.updateRecommendationsDisplay();
    }

    loadData() {
        // Simulate data loading
        this.weatherData = {
            temperature: 28,
            humidity: 75,
            rainfall: 15,
            forecast: 'sunny'
        };

        this.soilData = {
            moisture: 65,
            ph: 6.2,
            nutrients: {
                nitrogen: 75,
                phosphorus: 68,
                potassium: 82
            }
        };
    }

    generateRecommendations() {
        this.recommendations = [
            {
                id: 'rec-001',
                title: 'Irrigation Schedule Adjustment',
                description: 'Based on current soil moisture (65%) and weather forecast, adjust irrigation to every 2 days instead of daily.',
                priority: 'high',
                category: 'irrigation',
                impact: 'water conservation',
                effort: 'low',
                timeframe: 'immediate',
                icon: 'tint',
                status: 'pending'
            },
            {
                id: 'rec-002',
                title: 'Fertilizer Application',
                description: 'Phosphorus levels are below optimal (68%). Apply phosphorus-rich fertilizer to Zone C.',
                priority: 'medium',
                category: 'fertilization',
                impact: 'plant growth',
                effort: 'medium',
                timeframe: 'this week',
                icon: 'seedling',
                status: 'pending'
            },
            {
                id: 'rec-003',
                title: 'Pest Monitoring',
                description: 'High humidity (75%) increases pest risk. Implement daily pest monitoring in all zones.',
                priority: 'high',
                category: 'pest control',
                impact: 'crop protection',
                effort: 'medium',
                timeframe: 'immediate',
                icon: 'bug',
                status: 'in-progress'
            },
            {
                id: 'rec-004',
                title: 'Pruning Schedule',
                description: 'Optimal weather conditions for pruning. Schedule pruning for mature trees in Zone A and B.',
                priority: 'low',
                category: 'maintenance',
                impact: 'tree health',
                effort: 'high',
                timeframe: 'next week',
                icon: 'cut',
                status: 'pending'
            },
            {
                id: 'rec-005',
                title: 'Soil pH Adjustment',
                description: 'Zone C soil pH is 5.8, below optimal range. Apply lime to raise pH to 6.0-6.5.',
                priority: 'medium',
                category: 'soil management',
                impact: 'nutrient availability',
                effort: 'medium',
                timeframe: 'this month',
                icon: 'mountain',
                status: 'pending'
            }
        ];
    }

    updateRecommendationsDisplay() {
        this.updateRecommendationsList();
        this.updatePrioritySummary();
        this.updateCategoryBreakdown();
    }

    updateRecommendationsList() {
        const container = document.querySelector('.recommendations-list');
        if (!container) return;

        container.innerHTML = this.recommendations.map(rec => `
            <div class="recommendation-card ${rec.priority} ${rec.status}" data-rec-id="${rec.id}">
                <div class="rec-header">
                    <div class="rec-icon">
                        <i class="fas fa-${rec.icon}"></i>
                    </div>
                    <div class="rec-title-section">
                        <h3 class="rec-title">${rec.title}</h3>
                        <div class="rec-meta">
                            <span class="rec-category">${rec.category}</span>
                            <span class="rec-priority">${rec.priority}</span>
                            <span class="rec-timeframe">${rec.timeframe}</span>
                        </div>
                    </div>
                    <div class="rec-actions">
                        <button class="btn-action ${rec.status === 'completed' ? 'completed' : ''}" 
                                onclick="recommendationsDashboard.toggleRecommendation('${rec.id}')">
                            <i class="fas fa-${rec.status === 'completed' ? 'check' : 'check-circle'}"></i>
                        </button>
                        <button class="btn-action" onclick="recommendationsDashboard.viewDetails('${rec.id}')">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    </div>
                </div>
                <div class="rec-content">
                    <p class="rec-description">${rec.description}</p>
                    <div class="rec-metrics">
                        <div class="metric">
                            <span class="metric-label">Impact</span>
                            <span class="metric-value">${rec.impact}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Effort</span>
                            <span class="metric-value">${rec.effort}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updatePrioritySummary() {
        const summary = this.calculatePrioritySummary();
        
        this.updateCard('.high-priority-count', summary.high);
        this.updateCard('.medium-priority-count', summary.medium);
        this.updateCard('.low-priority-count', summary.low);
        this.updateCard('.completed-count', summary.completed);
    }

    calculatePrioritySummary() {
        return {
            high: this.recommendations.filter(r => r.priority === 'high').length,
            medium: this.recommendations.filter(r => r.priority === 'medium').length,
            low: this.recommendations.filter(r => r.priority === 'low').length,
            completed: this.recommendations.filter(r => r.status === 'completed').length
        };
    }

    updateCategoryBreakdown() {
        const categories = this.getCategoryBreakdown();
        const container = document.querySelector('.category-breakdown');
        if (!container) return;

        container.innerHTML = Object.entries(categories).map(([category, count]) => `
            <div class="category-item">
                <span class="category-name">${category}</span>
                <span class="category-count">${count}</span>
            </div>
        `).join('');
    }

    getCategoryBreakdown() {
        const breakdown = {};
        this.recommendations.forEach(rec => {
            breakdown[rec.category] = (breakdown[rec.category] || 0) + 1;
        });
        return breakdown;
    }

    updateCard(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }

    setupEventListeners() {
        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterRecommendations(e.target.dataset.filter);
            });
        });

        // Sort dropdown
        const sortSelect = document.querySelector('.sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortRecommendations(e.target.value);
            });
        }

        // Search input
        const searchInput = document.querySelector('.search-recommendations');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchRecommendations(e.target.value);
            });
        }

        // Mark all as read
        const markAllBtn = document.querySelector('.mark-all-btn');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', () => {
                this.markAllAsRead();
            });
        }
    }

    filterRecommendations(filter) {
        const cards = document.querySelectorAll('.recommendation-card');
        
        cards.forEach(card => {
            if (filter === 'all' || card.classList.contains(filter)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });

        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    }

    sortRecommendations(sortBy) {
        switch (sortBy) {
            case 'priority':
                this.recommendations.sort((a, b) => {
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                });
                break;
            case 'category':
                this.recommendations.sort((a, b) => a.category.localeCompare(b.category));
                break;
            case 'timeframe':
                this.recommendations.sort((a, b) => {
                    const timeframeOrder = { immediate: 4, 'this week': 3, 'next week': 2, 'this month': 1 };
                    return timeframeOrder[b.timeframe] - timeframeOrder[a.timeframe];
                });
                break;
        }
        
        this.updateRecommendationsList();
    }

    searchRecommendations(query) {
        const cards = document.querySelectorAll('.recommendation-card');
        
        cards.forEach(card => {
            const title = card.querySelector('.rec-title').textContent.toLowerCase();
            const description = card.querySelector('.rec-description').textContent.toLowerCase();
            const searchQuery = query.toLowerCase();
            
            if (title.includes(searchQuery) || description.includes(searchQuery)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    toggleRecommendation(recId) {
        const recommendation = this.recommendations.find(r => r.id === recId);
        if (!recommendation) return;

        recommendation.status = recommendation.status === 'completed' ? 'pending' : 'completed';
        this.updateRecommendationsDisplay();
    }

    viewDetails(recId) {
        const recommendation = this.recommendations.find(r => r.id === recId);
        if (!recommendation) return;

        this.showRecommendationModal(recommendation);
    }

    showRecommendationModal(recommendation) {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${recommendation.title}</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${recommendation.description}</p>
                    <div class="modal-details">
                        <div class="detail-item">
                            <strong>Priority:</strong> ${recommendation.priority}
                        </div>
                        <div class="detail-item">
                            <strong>Category:</strong> ${recommendation.category}
                        </div>
                        <div class="detail-item">
                            <strong>Impact:</strong> ${recommendation.impact}
                        </div>
                        <div class="detail-item">
                            <strong>Effort:</strong> ${recommendation.effort}
                        </div>
                        <div class="detail-item">
                            <strong>Timeframe:</strong> ${recommendation.timeframe}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="recommendationsDashboard.toggleRecommendation('${recommendation.id}')">
                        ${recommendation.status === 'completed' ? 'Mark as Pending' : 'Mark as Completed'}
                    </button>
                    <button class="btn btn-secondary close-modal">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.remove();
            });
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    markAllAsRead() {
        this.recommendations.forEach(rec => {
            if (rec.status === 'pending') {
                rec.status = 'completed';
            }
        });
        this.updateRecommendationsDisplay();
    }
}

// Initialize recommendations dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.recommendationsDashboard = new RecommendationsDashboard();
});
