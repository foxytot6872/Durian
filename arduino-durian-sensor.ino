/*
 * Durian Farm Sensor System
 * Real-time data transmission to Firebase
 * Compatible with ESP32
 */

#include <WiFi.h>
#include <FirebaseESP32.h>
#include <ArduinoJson.h>

// WiFi credentials - UPDATE THESE
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Firebase configuration - UPDATE THESE
#define FIREBASE_HOST "your-project-id-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "your-database-secret"

// Firebase Data object
FirebaseData firebaseData;

// Sensor pins
const int moisturePin = A0;
const int temperaturePin = A1;
const int humidityPin = A2;
const int lightPin = A3;

// Zone identifier
const String ZONE_ID = "A"; // Change to B, C, D for different zones

// Timing
unsigned long lastUpdate = 0;
const unsigned long UPDATE_INTERVAL = 30000; // 30 seconds

void setup() {
  Serial.begin(115200);
  Serial.println("🌱 Durian Farm Sensor System Starting...");
  
  // Initialize pins
  pinMode(moisturePin, INPUT);
  pinMode(temperaturePin, INPUT);
  pinMode(humidityPin, INPUT);
  pinMode(lightPin, INPUT);
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize Firebase
  initializeFirebase();
  
  Serial.println("✅ System ready! Sending data to Firebase...");
}

void loop() {
  if (millis() - lastUpdate >= UPDATE_INTERVAL) {
    sendSensorData();
    lastUpdate = millis();
  }
  
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi disconnected. Reconnecting...");
    connectToWiFi();
  }
  
  delay(1000);
}

void connectToWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("🔗 Connecting to WiFi");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("✅ WiFi connected!");
    Serial.print("📡 IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("❌ WiFi connection failed!");
    Serial.println("Please check your credentials and try again.");
  }
}

void initializeFirebase() {
  Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);
  Firebase.reconnectWiFi(true);
  
  // Set timeout
  Firebase.setReadTimeout(firebaseData, 1000 * 60);
  Firebase.setwriteSizeLimit(firebaseData, "tiny");
  
  Serial.println("🔥 Firebase initialized!");
}

void sendSensorData() {
  // Read sensor values
  int moistureRaw = analogRead(moisturePin);
  int temperatureRaw = analogRead(temperaturePin);
  int humidityRaw = analogRead(humidityPin);
  int lightRaw = analogRead(lightPin);
  
  // Convert to meaningful values
  float moisture = map(moistureRaw, 0, 4095, 0, 100);
  float temperature = (temperatureRaw * 3.3 / 4095.0 - 0.5) * 100;
  float humidity = map(humidityRaw, 0, 4095, 0, 100);
  float light = map(lightRaw, 0, 4095, 0, 100);
  
  // Create timestamp
  unsigned long timestamp = millis();
  
  // Create JSON object
  StaticJsonDocument<300> doc;
  doc["zoneId"] = ZONE_ID;
  doc["moisture"] = moisture;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["light"] = light;
  doc["timestamp"] = timestamp;
  doc["rawValues"]["moisture"] = moistureRaw;
  doc["rawValues"]["temperature"] = temperatureRaw;
  doc["rawValues"]["humidity"] = humidityRaw;
  doc["rawValues"]["light"] = lightRaw;
  
  // Convert to string
  String jsonStr;
  serializeJson(doc, jsonStr);
  
  // Send to Firebase
  String path = "/sensorData/zone" + ZONE_ID;
  
  Serial.println("📤 Sending data to Firebase...");
  Serial.println("Path: " + path);
  Serial.println("Data: " + jsonStr);
  
  if (Firebase.setJSON(firebaseData, path, jsonStr)) {
    Serial.println("✅ Data sent successfully!");
    
    // Also update zone status
    updateZoneStatus(moisture, temperature, humidity);
    
  } else {
    Serial.println("❌ Failed to send data!");
    Serial.println("Error: " + firebaseData.errorReason());
  }
}

void updateZoneStatus(float moisture, float temperature, float humidity) {
  // Determine zone health status
  String status = "healthy";
  
  if (moisture < 30 || temperature > 40 || humidity < 20) {
    status = "critical";
  } else if (moisture < 50 || temperature > 35 || humidity < 40) {
    status = "warning";
  }
  
  // Create zone status object
  StaticJsonDocument<200> zoneDoc;
  zoneDoc["status"] = status;
  zoneDoc["moisture"] = moisture;
  zoneDoc["temperature"] = temperature;
  zoneDoc["humidity"] = humidity;
  zoneDoc["lastUpdate"] = millis();
  zoneDoc["plantCount"] = 45; // Static for now, can be made dynamic
  
  String zoneJson;
  serializeJson(zoneDoc, zoneJson);
  
  String zonePath = "/zones/zone" + ZONE_ID;
  
  if (Firebase.setJSON(firebaseData, zonePath, zoneJson)) {
    Serial.println("✅ Zone status updated!");
  } else {
    Serial.println("❌ Failed to update zone status!");
  }
}

// Utility function to print sensor readings
void printSensorReadings() {
  Serial.println("📊 Current Sensor Readings:");
  Serial.println("Moisture: " + String(analogRead(moisturePin)) + "%");
  Serial.println("Temperature: " + String(analogRead(temperaturePin)) + "°C");
  Serial.println("Humidity: " + String(analogRead(humidityPin)) + "%");
  Serial.println("Light: " + String(analogRead(lightPin)) + "%");
  Serial.println("---");
}
