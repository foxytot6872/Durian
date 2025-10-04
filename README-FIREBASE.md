# Firebase Backend Setup for Durian Dashboard

This guide will help you set up Firebase as the backend for your Durian Dashboard application.

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ installed
- Firebase CLI installed: `npm install -g firebase-tools`
- A Google account

### 2. Firebase Project Setup

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `durian-dashboard`
4. Enable Google Analytics (optional)
5. Click "Create project"

#### Enable Services
1. **Authentication**: Go to Authentication → Sign-in method → Enable Email/Password
2. **Firestore**: Go to Firestore Database → Create database → Start in test mode
3. **Storage**: Go to Storage → Get started → Start in test mode
4. **Functions**: Go to Functions → Get started

### 3. Install Dependencies

```bash
# Install project dependencies
npm install

# Install Firebase CLI globally (if not already installed)
npm install -g firebase-tools
```

### 4. Firebase Configuration

#### Login to Firebase
```bash
firebase login
```

#### Initialize Firebase in your project
```bash
firebase init
```

Select the following services:
- ✅ Firestore
- ✅ Functions
- ✅ Hosting
- ✅ Storage

#### Update Firebase Config
1. Copy your Firebase config from Project Settings → General → Your apps
2. Update `js/firebase-config.js` with your actual config:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

### 5. Database Structure

The Firebase setup includes the following collections:

#### Collections:
- **users** - User profiles and settings
- **zones** - Farm zone information and status
- **sensorData** - Real-time sensor readings
- **valveControls** - Irrigation and valve control status
- **cameraFeeds** - Camera feed configurations
- **diseaseDetection** - Disease detection alerts
- **analytics** - Farm analytics and reports
- **weatherData** - Weather information
- **notifications** - System notifications
- **automatedActions** - Automated system actions

### 6. Deploy to Firebase

#### Deploy Functions
```bash
npm run deploy:functions
```

#### Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

#### Deploy Everything
```bash
npm run deploy
```

### 7. Development Setup

#### Start Firebase Emulators (for local development)
```bash
npm run dev
```

This will start:
- Firestore emulator on port 8080
- Functions emulator on port 5001
- Auth emulator on port 9099
- Storage emulator on port 9199
- Hosting emulator on port 5000
- Emulator UI on port 4000

#### Update your firebase-config.js for local development:
```javascript
// For local development with emulators
if (window.location.hostname === 'localhost') {
    firebaseConfig.authDomain = 'localhost:9099';
    // Add other emulator configurations
}
```

## 📊 Database Schema

### Zones Collection
```javascript
{
  "zoneId": "A",
  "name": "North Field",
  "status": "healthy",
  "sensorData": {
    "moisture": 68,
    "temperature": 27,
    "humidity": 75,
    "plantCount": 45
  },
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

### Sensor Data Collection
```javascript
{
  "zoneId": "A",
  "sensorType": "moisture",
  "value": 68,
  "unit": "%",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Valve Controls Collection
```javascript
{
  "zoneId": "A",
  "wateringValve": {
    "isOpen": false,
    "lastToggled": "2024-01-15T10:30:00Z",
    "settings": {
      "pressure": 2.5,
      "flowRate": 15
    }
  },
  "fertilizerValve": {
    "isOpen": false,
    "lastToggled": "2024-01-15T10:30:00Z"
  },
  "pestControlValve": {
    "isOpen": false,
    "lastToggled": "2024-01-15T10:30:00Z"
  }
}
```

## 🔧 Cloud Functions

The setup includes several automated Cloud Functions:

### 1. Auto Watering (`autoWatering`)
- Runs every 6 hours
- Checks moisture levels
- Automatically triggers watering if moisture < 30%

### 2. Disease Detection Alert (`diseaseDetectionAlert`)
- Triggers when new disease is detected
- Sends notifications
- Updates zone status for critical diseases

### 3. Weather-Based Irrigation (`weatherBasedIrrigation`)
- Runs every hour
- Adjusts irrigation based on weather conditions
- Considers rainfall, temperature, and humidity

### 4. Daily Analytics (`generateDailyAnalytics`)
- Runs daily at midnight
- Generates farm performance analytics
- Calculates zone health metrics

### 5. Data Cleanup (`cleanupOldData`)
- Runs daily at 2 AM
- Removes sensor data older than 30 days
- Keeps database optimized

## 🔐 Security Rules

The Firestore security rules ensure:
- Users can only access their own data
- Authenticated users can read/write farm data
- Proper validation for all operations

## 📱 Frontend Integration

### Include Firebase in your HTML:
```html
<!-- Add to your HTML files -->
<script type="module" src="js/firebase-config.js"></script>
<script type="module" src="js/firebase-database.js"></script>
<script type="module" src="js/firebase-integration.js"></script>
```

### Initialize in your JavaScript:
```javascript
import { firebaseIntegration } from './js/firebase-integration.js';

// Firebase integration is auto-initialized
// Real-time data will automatically update your UI
```

## 🚨 Troubleshooting

### Common Issues:

1. **Firebase not connecting**
   - Check your config values
   - Ensure project is properly initialized
   - Verify authentication is enabled

2. **Functions not deploying**
   - Check Node.js version (18+)
   - Run `npm install` in firebase-functions directory
   - Check Firebase CLI version

3. **Real-time updates not working**
   - Verify Firestore rules
   - Check browser console for errors
   - Ensure listeners are properly set up

### Debug Commands:
```bash
# Check Firebase status
firebase projects:list

# View logs
firebase functions:log

# Test emulators
firebase emulators:start --debug
```

## 📈 Monitoring

### Firebase Console Monitoring:
- **Authentication**: User management and sign-ins
- **Firestore**: Database usage and performance
- **Functions**: Function execution and errors
- **Storage**: File uploads and downloads
- **Analytics**: App usage and performance

### Custom Analytics:
- Zone performance tracking
- Sensor data trends
- Automated action logs
- Disease detection history

## 🔄 Next Steps

1. **Set up monitoring alerts** for critical farm conditions
2. **Configure automated notifications** for farmers
3. **Implement machine learning** for disease prediction
4. **Add mobile app integration** for field workers
5. **Set up backup and disaster recovery** procedures

## 📞 Support

For issues with Firebase setup:
- Check [Firebase Documentation](https://firebase.google.com/docs)
- Review [Firebase Console](https://console.firebase.google.com/)
- Check function logs in Firebase Console → Functions

For Durian Dashboard specific issues:
- Review browser console for JavaScript errors
- Check Firestore rules and permissions
- Verify real-time listeners are working
