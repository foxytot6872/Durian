#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

/*********************************************
 * DURIAN FARM DASHBOARD - ESP32 SENSOR SYSTEM
 * Firebase Realtime Database Integration
 * 
 * Architecture:
 * - Device Registry: /device_registry/<deviceId>/
 * - User Devices: /users/<uid>/devices/<deviceId>/sensor_data/
 * 
 * See FIREBASE_RTDB_ARCHITECTURE.md for complete structure
 *********************************************/

// ---- WiFi Configuration ----
#define WIFI_SSID       "Jak2.4G_"
#define WIFI_PASSWORD   "Jakk626442"

// ---- Firebase Realtime Database URL ----
#define FIREBASE_URL "https://testing-151e6-default-rtdb.asia-southeast1.firebasedatabase.app"

// ---- Global State ----
String deviceId = "";      // Format: esp32_<12 hex characters>
String ownerUid = "";      // Firebase Auth UID of device owner
bool deviceClaimed = false; // Whether device has been claimed   

/*********************************************
 * HTTP GET Helper
 * Returns response payload as String
 *********************************************/
String httpGET(String url) {
  HTTPClient http;
  
  if (!http.begin(url)) {
    Serial.println("❌ ERROR: Failed to connect to server");
    return "";
  }
  
  int httpCode = http.GET();
  String payload = http.getString();
  http.end();

  Serial.printf("[GET] %s\n", url.c_str());
  Serial.printf("HTTP Code: %d\n", httpCode);
  
  if (httpCode > 0 && httpCode < 400) {
    Serial.println("Response OK");
  } else {
    Serial.printf("⚠ Warning: HTTP Code %d\n", httpCode);
  }
  
  Serial.println("Payload:");
  Serial.println(payload);
  Serial.println("---");

  return payload;
}

/*********************************************
 * HTTP PUT Helper
 * Uploads JSON data to Firebase
 * Returns HTTP status code
 *********************************************/
int httpPUT(String url, String json) {
  HTTPClient http;
  
  if (!http.begin(url)) {
    Serial.println("❌ ERROR: Failed to connect to server");
    return -1;
  }
  
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.PUT(json);
  String payload = http.getString();
  http.end();

  Serial.printf("[PUT] %s\n", url.c_str());
  Serial.printf("HTTP Code: %d\n", httpCode);
  Serial.println("Request JSON:");
  Serial.println(json);
  
  if (httpCode > 0 && httpCode < 400) {
    Serial.println("✅ Upload successful");
  } else {
    Serial.printf("❌ Upload failed: HTTP %d\n", httpCode);
    Serial.println("Response:");
    Serial.println(payload);
  }
  
  Serial.println("---");

  return httpCode;
}

/*********************************************
 * STEP 1 — Generate Device ID from MAC Address
 * 
 * Format: esp32_<12 hex characters>
 * Pattern: /^esp32_[A-Z0-9]{12}$/
 * 
 * Process:
 * 1. Get MAC address: "28:56:2F:68:68:DC"
 * 2. Remove colons: "28562F6868DC"
 * 3. Uppercase: "28562F6868DC"
 * 4. Prepend: "esp32_28562F6868DC"
 * 
 * Example:
 *   MAC: 28:56:2F:68:68:DC
 *   Device ID: esp32_28562F6868DC
 *********************************************/
String getDeviceID() {
  String mac = WiFi.macAddress();
  mac.replace(":", "");   // Remove all colons
  mac.toUpperCase();      // Convert to uppercase (required format)
  String deviceId = "esp32_" + mac;
  
  // Validate format (should be 19 chars: "esp32_" + 12 hex)
  if (deviceId.length() != 19) {
    Serial.println("⚠ WARNING: Device ID length unexpected!");
  }
  
  return deviceId;
}

/*********************************************
 * STEP 2 — Wait for Device Claim
 * 
 * Checks /device_registry/<deviceId>.json
 * 
 * Logic:
 * - If response == "null" → Device NOT CLAIMED → Wait 5s, retry
 * - If response contains "owner_uid" → Device CLAIMED → Save ownerUid, proceed
 * 
 * Per Firebase RTDB Architecture:
 * Path: /device_registry/<deviceId>/
 * Fields: owner_uid, claimed, name, zone, firmware_version
 *********************************************/
void waitForDeviceClaim() {
  Serial.println("\n=================================");
  Serial.println("🔍 CHECKING DEVICE CLAIM STATUS");
  Serial.println("=================================");
  Serial.print("Device ID: ");
  Serial.println(deviceId);
  Serial.println("Querying Firebase...\n");

  int attemptCount = 0;

  while (true) {
    attemptCount++;
    
    // Build URL: /device_registry/<deviceId>.json
    String url = FIREBASE_URL;
    url += "/device_registry/" + deviceId + ".json";
    
    Serial.printf("Attempt #%d\n", attemptCount);
    Serial.print("Querying URL: ");
    Serial.println(url);
    Serial.println("");
    
    String response = httpGET(url);
    
    // Trim whitespace from response
    response.trim();

    // Case 1: Device doesn't exist (not claimed yet)
    if (response == "null" || response.length() == 0) {
      Serial.println("⚠ Device NOT CLAIMED");
      Serial.print("   → Device ID being checked: ");
      Serial.println(deviceId);
      Serial.println("   → This device ID does not exist in Firebase");
      Serial.println("   → Please claim this device in the dashboard using the Device ID above");
      Serial.println("   → Retrying in 5 seconds...\n");
      delay(5000);
      continue;
    }

    // Case 2: Parse device registry object
    DynamicJsonDocument doc(512);
    DeserializationError err = deserializeJson(doc, response);

    if (err) {
      Serial.print("❌ JSON parse error: ");
      Serial.println(err.c_str());
      Serial.println("   → Retrying in 3 seconds...\n");
      delay(3000);
      continue;
    }

    // Case 3: Device exists but no owner_uid (shouldn't happen, but handle it)
    if (!doc.containsKey("owner_uid")) {
      Serial.println("⚠ Device exists but NOT assigned to a user");
      Serial.println("   → Waiting...\n");
      delay(4000);
      continue;
    }

    // Case 4: Device is claimed! Extract owner_uid
    ownerUid = doc["owner_uid"].as<String>();

    if (ownerUid.length() == 0) {
      Serial.println("⚠ owner_uid is empty");
      Serial.println("   → Waiting...\n");
      delay(4000);
      continue;
    }

    // Success! Device is claimed
    deviceClaimed = true;
    
    Serial.println("\n=================================");
    Serial.println("🎉 DEVICE CLAIMED SUCCESSFULLY!");
    Serial.println("=================================");
    Serial.print("Owner UID: ");
    Serial.println(ownerUid);
    
    // Display device info if available
    if (doc.containsKey("name")) {
      Serial.print("Device Name: ");
      Serial.println(doc["name"].as<String>());
    }
    if (doc.containsKey("zone")) {
      Serial.print("Zone: ");
      Serial.println(doc["zone"].as<String>());
    }
    Serial.println("=================================\n");
    Serial.println("✅ Ready to upload sensor data!");
    Serial.println("");

    break;
  }
}

/*********************************************
 * STEP 3 — Upload Sensor Data to Firebase
 * 
 * Path: /users/<ownerUid>/devices/<deviceId>/sensor_data/
 * 
 * Per Firebase RTDB Architecture:
 * - PUT operation (overwrites previous data)
 * - No authentication required (public write per security rules)
 * - Data structure matches specification exactly
 * 
 * Sensor Data Fields:
 *   moisture: float
 *   temperature: float
 *   ec: integer (electrical conductivity)
 *   ph: float
 *   n: integer (nitrogen)
 *   p: integer (phosphorus)
 *   k: integer (potassium)
 *   timestamp: integer (milliseconds since boot)
 *********************************************/
void uploadSensorData(float moisture, float temp, int ec, float ph, int n, int p, int k) {
  // Validate device is claimed
  if (!deviceClaimed || ownerUid.length() == 0) {
    Serial.println("❌ ERROR: Device not claimed. Cannot upload sensor data.");
    Serial.println("   → ownerUid is empty");
    return;
  }

  // Build path: /users/<ownerUid>/devices/<deviceId>/sensor_data.json
  String path = FIREBASE_URL;
  path += "/users/" + ownerUid + "/devices/" + deviceId + "/sensor_data.json";

  // Build JSON payload (matches Firebase RTDB Architecture specification)
  String json = "{";
  json += "\"moisture\":" + String(moisture, 2) + ",";
  json += "\"temperature\":" + String(temp, 2) + ",";
  json += "\"ec\":" + String(ec) + ",";
  json += "\"ph\":" + String(ph, 2) + ",";
  json += "\"n\":" + String(n) + ",";
  json += "\"p\":" + String(p) + ",";
  json += "\"k\":" + String(k) + ",";
  json += "\"timestamp\":" + String(millis());
  json += "}";

  // Upload to Firebase
  Serial.println("📤 Uploading sensor data...");
  int httpCode = httpPUT(path, json);
  
  if (httpCode > 0 && httpCode < 400) {
    Serial.println("✅ Sensor data uploaded successfully");
  } else {
    Serial.printf("❌ Failed to upload sensor data (HTTP %d)\n", httpCode);
  }
}

/*********************************************
 * SETUP - Initialize ESP32
 * 
 * 1. Initialize Serial communication
 * 2. Connect to WiFi
 * 3. Generate Device ID from MAC address
 * 4. Wait for device to be claimed
 *********************************************/
void setup() {
  // Initialize Serial
  Serial.begin(115200);
  delay(500);
  
  Serial.println("\n\n");
  Serial.println("=================================");
  Serial.println("🌱 DURIAN FARM SENSOR SYSTEM");
  Serial.println("   ESP32 Device Initialization");
  Serial.println("=================================\n");

  // Connect to WiFi
  Serial.print("📡 Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
    wifiAttempts++;
    if (wifiAttempts > 100) { // 30 second timeout
      Serial.println("\n❌ WiFi connection timeout!");
      Serial.println("   → Please check WiFi credentials");
      while(1) delay(1000); // Halt
    }
  }
  
  Serial.println("\n✅ WiFi connected!");
  Serial.print("   IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.println("");

  // Generate Device ID
  deviceId = getDeviceID();
  Serial.println("🆔 Device Identification:");
  Serial.print("   MAC Address: ");
  Serial.println(WiFi.macAddress());
  Serial.print("   Device ID: ");
  Serial.println(deviceId);
  Serial.println("");
  Serial.println("⚠ IMPORTANT: Use this Device ID when claiming the device in the dashboard!");
  Serial.println("   → Copy the Device ID above");
  Serial.println("   → Go to the device claim page");
  Serial.println("   → Paste this Device ID exactly as shown");
  Serial.println("");

  // Wait for device to be claimed
  waitForDeviceClaim();
}

/*********************************************
 * LOOP - Main Sensor Reading & Upload Cycle
 * 
 * TODO: Replace example values with actual sensor readings
 * 
 * Upload interval: 5 seconds (adjust as needed)
 *********************************************/
void loop() {
  // Ensure device is still claimed before uploading
  if (!deviceClaimed || ownerUid.length() == 0) {
    Serial.println("⚠ Device claim lost. Re-checking...");
    waitForDeviceClaim();
    return;
  }

  // TODO: Read actual sensor values here
  // Example sensor values (replace with real sensor readings)
  float moisture = 25.3;      // Soil moisture (%)
  float temp = 30.1;          // Temperature (°C)
  int ec = 890;               // Electrical conductivity (µS/cm)
  float ph = 6.4;             // pH level
  int n = 11;                 // Nitrogen (mg/kg)
  int p = 6;                  // Phosphorus (mg/kg)
  int k = 8;                  // Potassium (mg/kg)

  // Upload sensor data to Firebase
  uploadSensorData(moisture, temp, ec, ph, n, p, k);

  // Wait before next upload cycle
  Serial.println("⏳ Waiting 5 seconds before next upload...\n");
  delay(5000);
}

