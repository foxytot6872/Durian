# Durian Dashboard

A modern, responsive dashboard web application built with HTML, CSS, and JavaScript. Features interactive charts, data tables, and a beautiful UI design.

## Features

- 📊 **Interactive Charts** - Revenue overview and sales distribution using Chart.js
- 📱 **Responsive Design** - Works perfectly on desktop, tablet, and mobile devices
- 🎨 **Modern UI** - Clean, professional design with smooth animations
- 📈 **Real-time Data** - Animated statistics and dynamic content
- 🔍 **Search Functionality** - Built-in search bar for easy navigation
- 🔔 **Notifications** - Notification system with badge indicators
- 📋 **Data Tables** - Sortable tables for orders and products
- 🎯 **Interactive Elements** - Hover effects and smooth transitions

## Technologies Used

- **HTML5** - Semantic markup structure
- **CSS3** - Modern styling with Flexbox and Grid
- **JavaScript (ES6+)** - Interactive functionality
- **Chart.js** - Beautiful, responsive charts
- **Font Awesome** - Icon library
- **Google Fonts** - Typography

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js (optional, for development server)

### Installation

1. Clone or download the project files
2. Open `index.html` in your web browser
3. Or use a local development server:

```bash
# Install dependencies (optional)
npm install

# Start development server
npm start
```

### Firebase Gemini Chatbot Setup

If you want to deploy the Gemini chatbot backend, use the dedicated Firebase Functions folder:

```powershell
cd functions
npm install
firebase functions:secrets:set GEMINI_KEY
firebase deploy --only functions
```

When prompted for the secret value, paste your Gemini API key and press Enter. Do not leave it blank.

The chatbot code lives in [functions/index.js](functions/index.js) and reads the secret with `defineSecret('GEMINI_KEY')`.

### File Structure

```
durian-dashboard/
├── index.html          # Main HTML file
├── styles.css          # CSS styles
├── script.js           # JavaScript functionality
├── script.ts           # TypeScript source (optional)
├── package.json        # Project configuration
└── README.md          # This file
```

## Usage

### Dashboard Features

1. **Navigation Sidebar**
   - Click on menu items to navigate between sections
   - Responsive design collapses on mobile devices

2. **Statistics Cards**
   - View key metrics with animated counters
   - Color-coded positive/negative changes

3. **Charts**
   - Revenue chart with time period selector
   - Sales distribution pie chart
   - Interactive hover effects

4. **Data Tables**
   - Recent orders with status indicators
   - Top products with growth metrics
   - Responsive table design

5. **Search & Notifications**
   - Search functionality in header
   - Notification bell with badge count
   - User profile dropdown

### Customization

#### Adding New Data

```javascript
// Add a new order
dashboard.addOrder({
    id: '#ORD-006',
    customer: 'Jane Doe',
    product: 'Durian Premium',
    amount: 299.99,
    status: 'completed',
    date: '2024-01-16'
});

// Refresh all data
dashboard.refreshData();
```

#### Styling

The CSS uses CSS custom properties for easy theming:

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --text-color: #334155;
    --bg-color: #f8fafc;
}
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Performance

- Optimized CSS with minimal repaints
- Efficient JavaScript with event delegation
- Lazy loading for charts
- Responsive images and icons

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the package.json file for details.

## Acknowledgments

- Chart.js for beautiful charts
- Font Awesome for icons
- Google Fonts for typography
- Figma for design inspiration
