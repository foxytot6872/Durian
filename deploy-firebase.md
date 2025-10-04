# Firebase Deployment Guide for Durian Dashboard

## 🚀 Step-by-Step Deployment

### 1. Firebase Setup

#### Install Firebase CLI (if not already installed):
```bash
npm install -g firebase-tools
```

#### Login to Firebase:
```bash
firebase login
```
- This will open a browser window
- Sign in with your Google account
- Allow Firebase CLI access

### 2. Initialize Firebase Project

#### Create a new Firebase project:
```bash
firebase init
```

#### Select the following options:
- ✅ **Hosting**: Configure files for Firebase Hosting
- ✅ **Firestore**: Deploy rules and create indexes
- ✅ **Functions**: Deploy Cloud Functions
- ✅ **Storage**: Deploy Cloud Storage rules

#### Configuration:
- **Project**: Create a new project or select existing
- **Public directory**: `.` (current directory)
- **Single-page app**: `N` (No)
- **Overwrite index.html**: `N` (No)
- **Firestore rules file**: `firebase-rules.json`
- **Firestore indexes file**: `firestore.indexes.json`
- **Functions directory**: `firebase-functions`
- **Storage rules file**: `firebase-rules.json`

### 3. Update Firebase Configuration

#### Update `js/firebase-config.js` with your project details:
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

#### Get your config from:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings → General
4. Scroll down to "Your apps" section
5. Copy the config values

### 4. Deploy to Firebase

#### Deploy everything:
```bash
firebase deploy
```

#### Deploy specific services:
```bash
# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions

# Deploy only firestore rules
firebase deploy --only firestore:rules
```

### 5. Your Dashboard URL

After deployment, you'll get a URL like:
```
https://your-project-id.web.app
```

## 🔌 Arduino Integration Setup

### 1. Install Arduino Libraries

#### Add these libraries to Arduino IDE:
```cpp
// In Arduino IDE: Tools → Manage Libraries
- Firebase ESP32 Client
- ArduinoJson
- WiFi (built-in)
```

### 2. Arduino Code Template

#### Create `arduino-durian-sensor.ino`:
```cpp
#include <WiFi.h>
#include <FirebaseESP32.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Firebase configuration
#define FIREBASE_HOST "your-project-id-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "your-database-secret"

// Firebase Data object
FirebaseData firebaseData;

// Sensor pins
const int moisturePin = A0;
const int temperaturePin = A1;
const int humidityPin = A2;

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("WiFi connected!");
  
  // Initialize Firebase
  Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);
  Firebase.reconnectWiFi(true);
  
  Serial.println("Firebase initialized!");
}

void loop() {
  // Read sensor values
  int moisture = analogRead(moisturePin);
  int temperature = analogRead(temperaturePin);
  int humidity = analogRead(humidityPin);
  
  // Convert to meaningful values
  float moisturePercent = map(moisture, 0, 4095, 0, 100);
  float temperatureC = (temperature * 3.3 / 4095.0 - 0.5) * 100;
  float humidityPercent = map(humidity, 0, 4095, 0, 100);
  
  // Create JSON object
  StaticJsonDocument<200> doc;
  doc["moisture"] = moisturePercent;
  doc["temperature"] = temperatureC;
  doc["humidity"] = humidityPercent;
  doc["timestamp"] = millis();
  
  // Send to Firebase
  String path = "/sensorData/zoneA";
  String jsonStr;
  serializeJson(doc, jsonStr);
  
  if (Firebase.setJSON(firebaseData, path, jsonStr)) {
    Serial.println("Data sent to Firebase!");
  } else {
    Serial.println("Failed to send data: " + firebaseData.errorReason());
  }
  
  delay(30000); // Send data every 30 seconds
}
```

### 3. Real-time Database Rules

#### Update `firebase-rules.json`:
```json
{
  "rules": {
    "sensorData": {
      ".read": true,
      ".write": true
    },
    "zones": {
      ".read": true,
      ".write": true
    },
    "valveControls": {
      ".read": true,
      ".write": true
    }
  }
}
```

### 4. Test the Integration

#### 1. Upload Arduino code to your ESP32
#### 2. Open Serial Monitor to see connection status
#### 3. Check Firebase Console → Realtime Database
#### 4. Your dashboard should show live data!

## 🔧 Troubleshooting

### Common Issues:

#### 1. **Firebase Connection Failed**
- Check WiFi credentials
- Verify Firebase project ID
- Ensure database rules allow read/write

#### 2. **Data Not Appearing**
- Check browser console for errors
- Verify Firebase config in `js/firebase-config.js`
- Check network tab for failed requests

#### 3. **Arduino Not Connecting**
- Verify WiFi credentials
- Check ESP32 board selection
- Ensure Firebase libraries are installed

### Debug Commands:

```bash
# Check Firebase status
firebase projects:list

# View deployment logs
firebase functions:log

# Test locally
firebase serve
```

## 📱 Mobile Access

Your dashboard will be accessible at:
- **Web**: `https://your-project-id.web.app`
- **Mobile**: Same URL works on mobile browsers
- **Offline**: Firebase provides offline support

## 🔄 Real-time Updates

The dashboard will automatically update when:
- Arduino sends new sensor data
- Valve controls are toggled
- Disease detection occurs
- Weather data changes

## 📊 Monitoring

### Firebase Console:
- **Hosting**: View deployment status
- **Firestore**: Monitor database usage
- **Functions**: Check function logs
- **Analytics**: Track user engagement

### Arduino Serial Monitor:
- Connection status
- Data transmission logs
- Error messages
- Sensor readings

## 🚀 Next Steps

1. **Deploy your dashboard** using the steps above
2. **Upload Arduino code** to your ESP32
3. **Test real-time data** flow
4. **Monitor performance** in Firebase Console
5. **Add more sensors** as needed

Your Durian Dashboard will now be live and receiving real-time data from your Arduino sensors! 🌱📊
