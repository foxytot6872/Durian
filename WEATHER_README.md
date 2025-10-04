# Weather Dashboard - Windy API Integration

A comprehensive weather dashboard application that integrates with the Windy API to display real-time weather data, forecasts, and interactive maps.

## 🌤️ Features

### **Weather Map Integration**
- **Interactive Windy Map** - Real-time weather visualization
- **Multiple Overlays** - Wind, temperature, pressure, clouds, precipitation
- **Pressure Levels** - Surface to 100 hPa atmospheric levels
- **Location Controls** - Pan, zoom, and center on specific locations

### **Weather Data Display**
- **Current Conditions** - Temperature, wind speed, humidity, visibility
- **Hourly Forecast** - 24-hour detailed weather predictions
- **Weather Alerts** - Real-time weather warnings and advisories
- **Interactive Charts** - Temperature and wind speed visualizations

### **Dashboard Features**
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Real-time Updates** - Automatic data refresh capabilities
- **Interactive Controls** - Overlay switching, level selection
- **Weather Stations** - Multiple location weather data

## 🚀 Getting Started

### **Prerequisites**
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for API calls
- Windy API key (optional - demo version included)

### **Installation**

1. **Clone or download** the project files
2. **Open `weather.html`** in your web browser
3. **Or use the development server:**
   ```bash
   npm start
   ```

### **Windy API Setup (Optional)**

For full weather map functionality:

1. **Get Windy API Key:**
   - Visit [Windy API Documentation](https://api.windy.com/)
   - Sign up for a free API key
   - Replace `YOUR_WINDY_API_KEY` in `js/components/weather-map.js`

2. **Update the API Key:**
   ```javascript
   // In js/components/weather-map.js
   this.windyAPI = await windyInit({
       key: 'YOUR_ACTUAL_API_KEY', // Replace this
       verbose: false,
       callback: () => {
           console.log('Windy API initialized successfully');
       }
   });
   ```

## 📁 File Structure

```
weather-dashboard/
├── weather.html                 # Main weather dashboard page
├── css/
│   ├── styles.css              # Base dashboard styles
│   └── weather.css             # Weather-specific styles
├── js/
│   ├── weather-dashboard.js    # Main weather application
│   ├── components/
│   │   ├── weather-map.js      # Windy API integration
│   │   └── weather-map-demo.js # Demo version (no API key)
│   ├── utils/
│   │   ├── constants.js        # Configuration
│   │   └── helpers.js          # Utility functions
│   └── components/
│       └── charts.js           # Chart functionality
└── assets/
    └── images/                 # Weather icons and images
```

## 🎯 Usage

### **Weather Map Controls**

1. **Overlay Selection:**
   - **Wind** - Wind speed and direction
   - **Temperature** - Air temperature at different levels
   - **Pressure** - Atmospheric pressure
   - **Clouds** - Cloud coverage
   - **Precipitation** - Rain and snow

2. **Pressure Level Selection:**
   - **Surface (1000 hPa)** - Ground level
   - **850 hPa** - Lower atmosphere
   - **500 hPa** - Mid atmosphere
   - **300 hPa** - Upper atmosphere

3. **Map Interaction:**
   - **Click** on weather stations for detailed data
   - **Zoom** in/out for different scales
   - **Pan** to explore different regions

### **Weather Data**

1. **Current Conditions:**
   - Real-time temperature, wind, humidity
   - Animated counters and trend indicators
   - Color-coded status indicators

2. **Forecasts:**
   - 24-hour detailed forecast
   - 7-day and 14-day outlooks
   - Interactive chart visualizations

3. **Weather Alerts:**
   - Real-time weather warnings
   - Severity levels and descriptions
   - Validity periods

## 🔧 Configuration

### **Default Location**
```javascript
// In js/weather-dashboard.js
this.currentLocation = { lat: 13.7563, lon: 100.5018 }; // Bangkok, Thailand
```

### **Weather Stations**
```javascript
// In js/components/weather-map-demo.js
const weatherStations = [
    { lat: 13.7563, lon: 100.5018, name: 'Bangkok', temp: '28°C', wind: '12 km/h', condition: 'sunny' },
    // Add more stations...
];
```

### **Chart Settings**
```javascript
// Temperature chart configuration
const temperatureChart = new Chart(ctx, {
    type: 'line',
    data: {
        // Chart data configuration
    },
    options: {
        // Chart options
    }
});
```

## 🌐 API Integration

### **Windy API**
- **Real-time weather data**
- **Global coverage**
- **Multiple atmospheric levels**
- **High-resolution forecasts**

### **Demo Mode**
- **No API key required**
- **Sample weather data**
- **Leaflet map fallback**
- **Full functionality demonstration**

## 📱 Responsive Design

### **Desktop (1024px+)**
- Full map display
- All controls visible
- Side-by-side charts

### **Tablet (768px - 1024px)**
- Stacked layout
- Collapsible controls
- Optimized map size

### **Mobile (< 768px)**
- Single column layout
- Touch-friendly controls
- Compact map display

## 🎨 Customization

### **Colors and Themes**
```css
/* In css/weather.css */
:root {
    --weather-primary: #4facfe;
    --weather-secondary: #00f2fe;
    --weather-accent: #ff6b6b;
}
```

### **Weather Icons**
```javascript
// Custom weather icons
const iconMap = {
    sunny: '☀️',
    cloudy: '☁️',
    rainy: '🌧️',
    stormy: '⛈️'
};
```

## 🚨 Troubleshooting

### **Map Not Loading**
1. Check internet connection
2. Verify Windy API key (if using full version)
3. Check browser console for errors
4. Try demo version first

### **Data Not Updating**
1. Check API key validity
2. Verify network connectivity
3. Check rate limiting
4. Refresh the page

### **Performance Issues**
1. Reduce map zoom level
2. Limit number of weather stations
3. Use demo mode for testing
4. Check browser memory usage

## 📊 Data Sources

- **Windy API** - Real-time weather data
- **OpenStreetMap** - Map tiles (demo version)
- **Sample Data** - Demo weather information

## 🔮 Future Enhancements

- **Historical Data** - Past weather analysis
- **Weather Alerts** - Push notifications
- **Custom Locations** - User-defined weather stations
- **Export Features** - Data download capabilities
- **Mobile App** - Native mobile application

## 📄 License

This project is licensed under the MIT License - see the package.json file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review the API documentation
- Open an issue on GitHub
- Contact the development team

---

**Note:** This is a demo implementation. For production use, ensure you have proper API keys and error handling in place.
