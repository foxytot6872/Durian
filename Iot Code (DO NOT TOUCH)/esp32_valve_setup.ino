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
#define WIFI_SSID       "Jak2.4G_"
#define WIFI_PASSWORD   "Jakk626442"

// ---- Firebase Realtime Database URL ----
#define FIREBASE_URL "https://testing-151e6-default-rtdb.asia-southeast1.firebasedatabase.app"

// ---- Valve Control Configuration ----
#define VALVE_RELAY_PIN 2  // GPIO 2 - Safe pin on ESP32 (not flash pins, not input-only)
                            // Change this if your relay is connected to a different pin

// NOTE: If your relay module is ACTIVE-LOW (common for relay modules):
//   - LOW = Relay ON (valve opens)
//   - HIGH = Relay OFF (valve closes)
// If your relay is ACTIVE-HIGH:
//   - HIGH = Relay ON (valve opens)
//   - LOW = Relay OFF (valve closes)
// Adjust the setValveState() function accordingly
#define RELAY_ACTIVE_LOW true  // Set to false if relay is active-high

// ---- Polling Configuration ----
#define VALVE_POLL_INTERVAL 2000  // Poll Firebase every 2 seconds (adjust as needed)

// ---- Global State ----
String deviceId = "";      // Format: esp32_<12 hex characters>
String ownerUid = "";      // Firebase Auth UID of device owner (userId)
bool deviceClaimed = false; // Whether device has been claimed
String lastValveStatus = ""; // Last known valve status to detect changes

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
      Serial.println("   → Update rules to allow public read for /valves/ path");
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
    String response = httpGET(url);
    
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

    // Display zone info (for logging only, not needed for valve path)
    if (doc.containsKey("zone")) {
      String zone = doc["zone"].as<String>();
      Serial.print("Zone: ");
      Serial.println(zone);
    }

    // Success! Device is claimed
    deviceClaimed = true;
    
    Serial.println("\n=================================");
    Serial.println("🎉 DEVICE CLAIMED SUCCESSFULLY!");
    Serial.println("=================================");
    Serial.print("Owner UID (userId): ");
    Serial.println(ownerUid);
    Serial.print("Device ID: ");
    Serial.println(deviceId);
    
    // Display device info if available
    if (doc.containsKey("name")) {
      Serial.print("Device Name: ");
      Serial.println(doc["name"].as<String>());
    }
    Serial.println("=================================\n");
    Serial.println("✅ Ready to read valve commands!");
    Serial.println("");

    break;
  }
}

/*********************************************
 * Set Valve State
 * 
 * Controls the relay pin based on valve status
 * Handles both active-low and active-high relay modules
 * 
 * @param state - "ON" or "OFF" (uppercase)
 *********************************************/
void setValveState(String state) {
  bool valveOn = (state == "ON");
  
  if (RELAY_ACTIVE_LOW) {
    // Active-low relay: LOW = ON, HIGH = OFF
    digitalWrite(VALVE_RELAY_PIN, valveOn ? LOW : HIGH);
  } else {
    // Active-high relay: HIGH = ON, LOW = OFF
    digitalWrite(VALVE_RELAY_PIN, valveOn ? HIGH : LOW);
  }
  
  Serial.print("🔧 Valve ");
  Serial.print(valveOn ? "turned ON" : "turned OFF");
  Serial.print(" (GPIO ");
  Serial.print(VALVE_RELAY_PIN);
  Serial.print(" = ");
  Serial.print(digitalRead(VALVE_RELAY_PIN));
  Serial.println(")");
}

/*********************************************
 * Read Valve Status from Firebase
 * 
 * Path: /users/<userId>/devices/<deviceId>/valve_control/valveStatus
 * 
 * Returns: "ON", "OFF", or "" (empty if error/not found)
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

  // Handle null or empty response
  if (response == "null" || response.length() == 0) {
    Serial.println("⚠ Valve status not found in Firebase (defaulting to OFF)");
    return "OFF"; // Default to OFF if not set
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
      Serial.print("✅ Valve status: ");
      Serial.print(currentStatus);
      Serial.println(" (unchanged)");
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
 * LOOP - Main Valve Control Cycle
 * 
 * Polls Firebase for valve status every VALVE_POLL_INTERVAL
 * Updates relay output if status changes
 *********************************************/
void loop() {
  // Ensure device is still claimed
  if (!deviceClaimed || ownerUid.length() == 0) {
    Serial.println("⚠ Device claim lost. Re-checking...");
    waitForDeviceClaim();
    // Re-read initial status after re-claiming
    lastValveStatus = readValveStatus();
    if (lastValveStatus.length() > 0) {
      setValveState(lastValveStatus);
    }
    return;
  }

  // Check valve status from Firebase
  checkValveStatus();

  // Wait before next poll
  delay(VALVE_POLL_INTERVAL);
}

