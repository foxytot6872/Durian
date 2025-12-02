#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

/*********************************************
 * DURIAN FARM DASHBOARD - ESP32 VALVE CONTROL SYSTEM
 * Firebase Realtime Database Integration
 * 
 * Architecture:
 * - Device Registry: /device_registry/<deviceId>/
 * - Valve Control: /users/<userId>/devices/<deviceId>/valve_control/valveStatus
 * 
 * This device reads valve commands from Firebase RTDB and controls
 * a relay connected to a valve based on "ON" or "OFF" commands.
 * 
 * Database Structure (matches existing device pattern):
 * /users/{userId}/devices/{deviceId}/
 *   - device_info/
 *   - valve_control/
 *     - valveStatus: "ON" or "OFF"
 *********************************************/

// ---- WiFi Configuration ----
#define WIFI_SSID       "shawty_2.4G"
#define WIFI_PASSWORD   "sundaymorning"

// ---- Firebase Realtime Database URL ----
#define FIREBASE_URL "https://testing-151e6-default-rtdb.asia-southeast1.firebasedatabase.app"

// ---- Valve Control Configuration ----
// NOTE: GPIO 36 is INPUT-ONLY and cannot be used for relay output!
// Use a valid output pin instead. Safe output pins on ESP32:
// GPIO 2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33
#define VALVE_RELAY_PIN 17  // GPIO 2 - Safe output pin on ESP32
                            // Change this to match your relay connection

// Simple logic:
//   - valveStatus = "ON" → GPIO = HIGH (1) → LED/Relay ON
//   - valveStatus = "OFF" → GPIO = LOW (0) → LED/Relay OFF

// ---- Polling Configuration ----
#define VALVE_POLL_INTERVAL 2000  // Poll Firebase every 2 seconds (adjust as needed)

// ---- Global State ----
String deviceId = "";      // Format: esp32_<12 hex characters>
String ownerUid = "";      // Firebase Auth UID of device owner (userId)
bool deviceClaimed = false; // Whether device has been claimed
String lastValveStatus = ""; // Last known valve status to detect changes

/*********************************************
 * HTTP PUT Helper
 * Uploads JSON data to Firebase
 * Returns HTTP status code
 * Sets httpCode via reference to check for errors
 *********************************************/
int httpPUT(String url, String json, int* httpCodePtr = nullptr) {
  HTTPClient http;
  
  if (!http.begin(url)) {
    Serial.println("❌ ERROR: Failed to connect to server");
    if (httpCodePtr) *httpCodePtr = -1;
    return -1;
  }
  
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.PUT(json);
  String payload = http.getString();
  http.end();

  if (httpCodePtr) *httpCodePtr = httpCode;

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
 * HTTP GET Helper
 * Returns response payload as String
 * Sets httpCode via reference to check for errors
 *********************************************/
String httpGET(String url, int* httpCodePtr = nullptr) {
  HTTPClient http;
  
  if (!http.begin(url)) {
    Serial.println("❌ ERROR: Failed to connect to server");
    if (httpCodePtr) *httpCodePtr = -1;
    return "";
  }
  
  int httpCode = http.GET();
  String payload = http.getString();
  http.end();

  if (httpCodePtr) *httpCodePtr = httpCode;

  Serial.printf("[GET] %s\n", url.c_str());
  Serial.printf("HTTP Code: %d\n", httpCode);
  
  if (httpCode > 0 && httpCode < 400) {
    Serial.println("Response OK");
  } else {
    Serial.printf("⚠ Warning: HTTP Code %d\n", httpCode);
    if (httpCode == 401) {
      Serial.println("❌ PERMISSION DENIED - Check Firebase security rules!");
    }
  }
  
  Serial.println("Payload:");
  Serial.println(payload);
  Serial.println("---");

  return payload;
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
 * Extract Zone ID from Zone String
 * 
 * Converts "Zone A" -> "A", "Zone B" -> "B", etc.
 * If zone string is empty or invalid, returns empty string
 *********************************************/
String extractZoneId(String zone) {
  zone.trim();
  if (zone.length() == 0) {
    return "";
  }
  
  // Handle "Zone A", "Zone B", etc.
  if (zone.startsWith("Zone ")) {
    return zone.substring(5); // Extract everything after "Zone "
  }
  
  // If already just "A", "B", etc., return as-is
  return zone;
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
 * Fields: owner_uid, claimed, name, zone, firmware_version, farmId (optional)
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
    int httpCode = 0;
    String response = httpGET(url, &httpCode);
    
    // Trim whitespace from response
    response.trim();

    // Case 1: Device doesn't exist (not claimed yet)
    if (response == "null" || response.length() == 0) {
      Serial.println("⚠ Device NOT CLAIMED");
      Serial.println("Claim Device using ID: " + deviceId);
      Serial.println("   → Waiting for user to claim via dashboard...");
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

    // Case 4: Device is claimed! Extract all necessary info
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
    Serial.print("Device ID: ");
    Serial.println(deviceId);
    
    // Extract device info from registry
    String deviceName = "";
    String zone = "";
    
    if (doc.containsKey("name")) {
      deviceName = doc["name"].as<String>();
      Serial.print("Device Name: ");
      Serial.println(deviceName);
    }
    if (doc.containsKey("zone")) {
      zone = doc["zone"].as<String>();
      Serial.print("Zone: ");
      Serial.println(zone);
    }
    
    // Upload device info to Firebase (includes type: "valve")
    if (deviceName.length() > 0 || zone.length() > 0) {
      uploadDeviceInfo(deviceName, zone);
    }
    
    Serial.println("=================================\n");
    Serial.println("✅ Ready to read valve commands!");
    Serial.println("");

    break;
  }
}

/*********************************************
 * Upload Device Info to Firebase
 * 
 * Path: /users/<ownerUid>/devices/<deviceId>/device_info/
 * 
 * Writes device metadata including type, name, zone, etc.
 * This helps identify the device type (sensor, valve, etc.)
 *********************************************/
void uploadDeviceInfo(String deviceName, String zone) {
  // Validate device is claimed
  if (!deviceClaimed || ownerUid.length() == 0) {
    Serial.println("❌ ERROR: Device not claimed. Cannot upload device info.");
    return;
  }

  // Build path: /users/<ownerUid>/devices/<deviceId>/device_info.json
  String path = FIREBASE_URL;
  path += "/users/" + ownerUid + "/devices/" + deviceId + "/device_info.json";

  // Build JSON payload
  String json = "{";
  json += "\"device_id\":\"" + deviceId + "\",";
  json += "\"type\":\"valve\",";  // Device type: valve
  json += "\"name\":\"" + deviceName + "\",";
  json += "\"zone\":\"" + zone + "\",";
  json += "\"firmware_version\":\"1.0.0\",";
  json += "\"last_online\":" + String(millis());
  json += "}";

  // Upload to Firebase
  Serial.println("📤 Uploading device info...");
  int httpCode = 0;
  int result = httpPUT(path, json, &httpCode);
  
  if (httpCode > 0 && httpCode < 400) {
    Serial.println("✅ Device info uploaded successfully");
  } else {
    Serial.printf("❌ Failed to upload device info (HTTP %d)\n", httpCode);
  }
}

/*********************************************
 * Set Valve State
 * 
 * Simple logic:
 * - valveStatus = "ON" → GPIO = HIGH (1) → LED/Relay ON
 * - valveStatus = "OFF" → GPIO = LOW (0) → LED/Relay OFF
 * 
 * @param state - "ON" or "OFF" (uppercase)
 *********************************************/
void setValveState(String state) {
  // Normalize state to uppercase
  state.toUpperCase();
  
  // Validate pin is valid output pin
  if (VALVE_RELAY_PIN == 36 || VALVE_RELAY_PIN == 39) {
    Serial.println("❌ ERROR: GPIO 36/39 are INPUT-ONLY pins! Cannot use for output.");
    Serial.println("   → Change VALVE_RELAY_PIN to a valid output pin (2, 4, 5, 12-19, 21-23, 25-27, 32-33)");
    return;
  }
  
  // Simple direct mapping
  if (state == "ON") {
    digitalWrite(VALVE_RELAY_PIN, HIGH);  // GPIO = 1, LED ON
  } else if (state == "OFF") {
    digitalWrite(VALVE_RELAY_PIN, LOW);   // GPIO = 0, LED OFF
  } else {
    Serial.print("⚠ Invalid state: ");
    Serial.println(state);
    return;
  }
  
  Serial.print("🔧 Valve ");
  Serial.print(state);
  Serial.print(" → GPIO ");
  Serial.print(VALVE_RELAY_PIN);
  Serial.print(" = ");
  Serial.print(digitalRead(VALVE_RELAY_PIN));
  Serial.print(" (");
  Serial.print(state == "ON" ? "LED ON" : "LED OFF");
  Serial.println(")");
}

/*********************************************
 * Write Valve Status to Firebase
 * 
 * Path: /users/<userId>/devices/<deviceId>/valve_control/valveStatus
 * 
 * Note: ESP32 devices can write to this path (public write per security rules)
 *********************************************/
bool writeValveStatusToFirebase(String status) {
  // Validate required fields
  if (ownerUid.length() == 0 || deviceId.length() == 0) {
    Serial.println("❌ ERROR: Missing required identifiers (ownerUid or deviceId)");
    return false;
  }

  // Validate status
  status.toUpperCase();
  if (status != "ON" && status != "OFF") {
    Serial.println("❌ ERROR: Invalid valve status. Must be 'ON' or 'OFF'");
    return false;
  }

  // Build path: /users/<userId>/devices/<deviceId>/valve_control/valveStatus.json
  String url = FIREBASE_URL;
  url += "/users/" + ownerUid + "/devices/" + deviceId + "/valve_control/valveStatus.json";
  
  // Write as JSON string (with quotes)
  String json = "\"" + status + "\"";
  
  int httpCode = 0;
  int result = httpPUT(url, json, &httpCode);
  
  if (httpCode > 0 && httpCode < 400) {
    Serial.printf("✅ Valve status written to Firebase: %s\n", status.c_str());
    return true;
  } else {
    Serial.printf("❌ Failed to write valve status (HTTP %d)\n", httpCode);
    return false;
  }
}

/*********************************************
 * Read Valve Status from Firebase
 * 
 * Path: /users/<userId>/devices/<deviceId>/valve_control/valveStatus
 * 
 * Returns: "ON", "OFF", or "" (empty if error/not found)
 * If status doesn't exist, initializes it to "OFF" in Firebase
 *********************************************/
String readValveStatus() {
  // Validate required fields
  if (ownerUid.length() == 0 || deviceId.length() == 0) {
    Serial.println("❌ ERROR: Missing required identifiers (ownerUid or deviceId)");
    return "";
  }

  // Build path: /users/<userId>/devices/<deviceId>/valve_control/valveStatus.json
  String url = FIREBASE_URL;
  url += "/users/" + ownerUid + "/devices/" + deviceId + "/valve_control/valveStatus.json";
  
  int httpCode = 0;
  String response = httpGET(url, &httpCode);
  response.trim();

  // Handle HTTP errors
  if (httpCode == 401) {
    Serial.println("❌ PERMISSION DENIED: Firebase security rules need to be updated!");
    Serial.println("   → See FIREBASE_VALVE_RULES_UPDATE.md for instructions");
    Serial.println("   → Valve will default to OFF until rules are fixed");
    return "OFF"; // Default to OFF on permission error
  }

  if (httpCode < 200 || httpCode >= 400) {
    Serial.printf("⚠ HTTP Error %d when reading valve status\n", httpCode);
    return "OFF"; // Default to OFF on HTTP error
  }

  // Handle null or empty response - initialize to OFF in Firebase
  if (response == "null" || response.length() == 0) {
    Serial.println("⚠ Valve status not found in Firebase");
    Serial.println("   → Initializing valve status to OFF in Firebase...");
    
    // Write default "OFF" status to Firebase
    if (writeValveStatusToFirebase("OFF")) {
      Serial.println("✅ Valve status initialized to OFF in Firebase");
      return "OFF";
    } else {
      Serial.println("⚠ Failed to initialize valve status, using local default OFF");
      return "OFF";
    }
  }

  // Check if response is a JSON error object
  if (response.startsWith("{") && response.indexOf("error") >= 0) {
    Serial.println("❌ Firebase returned an error response");
    Serial.println("   → Check Firebase security rules");
    return "OFF"; // Default to OFF on error
  }

  // Remove quotes if JSON string
  if (response.startsWith("\"") && response.endsWith("\"")) {
    response = response.substring(1, response.length() - 1);
  }

  // Validate response is "ON" or "OFF"
  response.toUpperCase();
  if (response == "ON" || response == "OFF") {
    return response;
  } else {
    Serial.print("⚠ Invalid valve status: ");
    Serial.print(response);
    Serial.println(" (expected 'ON' or 'OFF', defaulting to OFF)");
    // Try to fix invalid status by writing "OFF"
    writeValveStatusToFirebase("OFF");
    return "OFF"; // Default to OFF for invalid values
  }
}

/*********************************************
 * Check and Update Valve Status
 * 
 * Reads valve status from Firebase and updates relay if changed
 *********************************************/
void checkValveStatus() {
  String currentStatus = readValveStatus();
  
  if (currentStatus.length() == 0) {
    // Error reading status, skip update
    return;
  }

  // Check if status changed
  if (currentStatus != lastValveStatus) {
    Serial.println("\n=================================");
    Serial.println("🔄 VALVE STATUS CHANGED");
    Serial.println("=================================");
    Serial.print("Previous: ");
    Serial.println(lastValveStatus.length() > 0 ? lastValveStatus : "(none)");
    Serial.print("Current:  ");
    Serial.println(currentStatus);
    Serial.print("Firebase valveStatus = ");
    Serial.println(currentStatus);
    
    // Update valve state
    setValveState(currentStatus);
    
    // Update last known status
    lastValveStatus = currentStatus;
    
    Serial.println("=================================\n");
  } else {
    // Status unchanged, just log periodically (every 10th check to reduce spam)
    static int checkCount = 0;
    checkCount++;
    if (checkCount % 10 == 0) {
      Serial.printf("✅ Valve status: %s (unchanged)\n", currentStatus.c_str());
    }
  }
}

/*********************************************
 * SETUP - Initialize ESP32
 * 
 * 1. Initialize Serial communication
 * 2. Initialize relay pin
 * 3. Connect to WiFi
 * 4. Generate Device ID from MAC address
 * 5. Wait for device to be claimed
 * 6. Initialize valve to OFF state
 *********************************************/
void setup() {
  // Initialize Serial
  Serial.begin(115200);
  delay(500);

  Serial.println("\n\n");
  Serial.println("=================================");
  Serial.println("💧 DURIAN FARM VALVE CONTROL");
  Serial.println("   ESP32 Device Initialization");
  Serial.println("=================================\n");

  // Initialize relay pin
  pinMode(VALVE_RELAY_PIN, OUTPUT);
  setValveState("OFF"); // Start with valve OFF
  Serial.print("✅ Relay pin ");
  Serial.print(VALVE_RELAY_PIN);
  Serial.println(" initialized (valve OFF)");
  Serial.println("");

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

  // Wait for device to be claimed
  waitForDeviceClaim();

  // Initial valve status read
  Serial.println("🔍 Reading initial valve status from Firebase...");
  lastValveStatus = readValveStatus();
  if (lastValveStatus.length() > 0) {
    setValveState(lastValveStatus);
    Serial.print("✅ Initial valve status: ");
    Serial.println(lastValveStatus);
  }
  Serial.println("");
  
  Serial.println("=================================");
  Serial.println("✅ VALVE CONTROL SYSTEM READY");
  Serial.println("=================================");
  Serial.print("Polling interval: ");
  Serial.print(VALVE_POLL_INTERVAL / 1000);
  Serial.println(" seconds");
  Serial.print("Valve path: /users/");
  Serial.print(ownerUid);
  Serial.print("/devices/");
  Serial.print(deviceId);
  Serial.println("/valve_control/valveStatus");
  Serial.println("=================================\n");
}

/*********************************************
 * Check if device is still claimed in registry
 * Returns true if still claimed, false if removed
 *********************************************/
bool verifyDeviceClaim() {
  if (deviceId.length() == 0) {
    return false;
  }

  String url = FIREBASE_URL;
  url += "/device_registry/" + deviceId + ".json";
  
  int httpCode = 0;
  String response = httpGET(url, &httpCode);
  response.trim();

  // Device doesn't exist (removed)
  if (response == "null" || response.length() == 0 || httpCode == 404) {
    Serial.println("⚠ Device has been removed from registry");
    return false;
  }

  // Parse response to check owner_uid
  DynamicJsonDocument doc(512);
  DeserializationError err = deserializeJson(doc, response);
  
  if (err) {
    Serial.println("⚠ Error parsing device registry response");
    return true; // Assume still claimed if parse fails
  }

  if (!doc.containsKey("owner_uid")) {
    Serial.println("⚠ Device registry entry has no owner_uid");
    return false;
  }

  String currentOwner = doc["owner_uid"].as<String>();
  if (currentOwner != ownerUid) {
    Serial.println("⚠ Device ownership changed");
    return false;
  }

  return true; // Device is still claimed
}

/*********************************************
 * LOOP - Main Valve Control Cycle
 * 
 * Polls Firebase for valve status every VALVE_POLL_INTERVAL
 * Updates relay output if status changes
 * Periodically verifies device is still claimed
 *********************************************/
void loop() {
  // Ensure device is still claimed
  if (!deviceClaimed || ownerUid.length() == 0) {
    Serial.println("\n⚠ Device claim lost. Re-checking...\n");
    waitForDeviceClaim();
    // Re-read initial status after re-claiming
    lastValveStatus = readValveStatus();
    if (lastValveStatus.length() > 0) {
      setValveState(lastValveStatus);
    }
    return;
  }

  // Periodically verify device is still in registry (every 30 seconds)
  static unsigned long lastClaimCheck = 0;
  unsigned long now = millis();
  if (now - lastClaimCheck > 30000) { // Check every 30 seconds
    lastClaimCheck = now;
    if (!verifyDeviceClaim()) {
      Serial.println("\n=================================");
      Serial.println("❌ DEVICE REMOVED FROM REGISTRY");
      Serial.println("=================================");
      Serial.println("Device has been removed from Firebase.");
      Serial.println("Resetting claim status and waiting for re-claim...");
      Serial.println("=================================\n");
      
      // Reset claim status
      deviceClaimed = false;
      ownerUid = "";
      lastValveStatus = "";
      
      // Turn valve OFF for safety
      setValveState("OFF");
      
      // Go back to waiting for claim
      waitForDeviceClaim();
      
      // Re-read initial status after re-claiming
      lastValveStatus = readValveStatus();
      if (lastValveStatus.length() > 0) {
        setValveState(lastValveStatus);
      }
      return;
    }
  }

  // Check valve status from Firebase
  checkValveStatus();

  // Wait before next poll
  delay(VALVE_POLL_INTERVAL);
}

