// Application constants and configuration
const CONFIG = {
    // API endpoints
    API_BASE_URL: 'https://api.durian-dashboard.com',
    ENDPOINTS: {
        ORDERS: '/api/orders',
        PRODUCTS: '/api/products',
        CUSTOMERS: '/api/customers',
        ANALYTICS: '/api/analytics'
    },

    // Chart configuration
    CHART_COLORS: {
        PRIMARY: 'rgb(102, 126, 234)',
        SECONDARY: 'rgb(240, 147, 251)',
        SUCCESS: 'rgb(67, 233, 123)',
        WARNING: 'rgb(255, 193, 7)',
        DANGER: 'rgb(220, 53, 69)',
        INFO: 'rgb(79, 172, 254)'
    },

    // Animation settings
    ANIMATION: {
        DURATION: 300,
        EASING: 'ease-in-out',
        CHART_ANIMATION_DURATION: 1000
    },

    // Responsive breakpoints
    BREAKPOINTS: {
        MOBILE: 480,
        TABLET: 768,
        DESKTOP: 1024,
        LARGE: 1200
    },

    // Default data
    DEFAULT_DATA: {
        ORDERS: [
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
        ],
        PRODUCTS: [
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
        ]
    },

    // Status types
    STATUS_TYPES: {
        ORDER: {
            COMPLETED: 'completed',
            PENDING: 'pending',
            CANCELLED: 'cancelled',
            PROCESSING: 'processing'
        }
    },

    // Chart periods
    CHART_PERIODS: [
        'Last 7 days',
        'Last 30 days',
        'Last 3 months',
        'Last 6 months',
        'Last year'
    ],

    // Table settings
    TABLE: {
        ITEMS_PER_PAGE: 10,
        SORT_DIRECTIONS: {
            ASC: 'asc',
            DESC: 'desc'
        }
    }
};

// Export for use in other modules
window.CONFIG = CONFIG;
