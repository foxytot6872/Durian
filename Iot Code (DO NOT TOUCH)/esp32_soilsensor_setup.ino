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

// ---- Modbus Configuration ----
#define DE_RE_PIN   4
#define MODE_SEND   HIGH
#define MODE_RECV   LOW

// ---- Global State ----
String deviceId = "";      // Format: esp32_<12 hex characters>
String ownerUid = "";      // Firebase Auth UID of device owner
bool deviceClaimed = false; // Whether device has been claimed 

// Serial2: RX=27, TX=26 (ตามบอร์ด IOXESP32)
const uint32_t MODBUS_BAUD = 4800;

// -------- CRC16 (Modbus) ----------
uint16_t modbusCRC(const uint8_t *buf, uint16_t len) {
  uint16_t crc = 0xFFFF;
  for (uint16_t pos = 0; pos < len; pos++) {
    crc ^= buf[pos];
    for (uint8_t i = 0; i < 8; i++) {
      if (crc & 0x0001) crc = (crc >> 1) ^ 0xA001;
      else              crc >>= 1;
    }
  }
  return crc;
}

// ส่งคำสั่งอ่าน Holding Registers addr=0x0000, qty=7 (ทั้งหมด 7 รีจิสเตอร์)
bool read7Regs(uint16_t outRegs[7]) {
  // Request: [ID=0x01][FC=0x03][AddrHi=0x00][AddrLo=0x00][QtyHi=0x00][QtyLo=0x07][CRCLo][CRCHi]
  uint8_t req[8] = { 0x01, 0x03, 0x00, 0x00, 0x00, 0x07, 0x00, 0x00 };
  uint16_t crc = modbusCRC(req, 6);
  req[6] = crc & 0xFF;       // CRC Low
  req[7] = (crc >> 8) & 0xFF; // CRC High

  // ตอบกลับคาดหวัง: [ID][FC][ByteCount=14][Data(14 bytes)][CRCLo][CRCHi] → รวม 19 bytes
  const size_t RESP_LEN = 19;
  uint8_t resp[RESP_LEN];

  // ส่ง
  digitalWrite(DE_RE_PIN, MODE_SEND);
  Serial2.write(req, sizeof(req));
  Serial2.flush();                 // รอส่งหมด
  digitalWrite(DE_RE_PIN, MODE_RECV);

  // รับ
  size_t got = 0;
  unsigned long t0 = millis();
  while (got < RESP_LEN && (millis() - t0) < 500) {  // timeout 500ms
    if (Serial2.available()) {
      resp[got++] = Serial2.read();
    }
  }
  if (got != RESP_LEN) {
    // ลองกรณีตอบผิดจังหวะ/เหลื่อม: เคลียร์บัฟเฟอร์
    while (Serial2.available()) (void)Serial2.read();
    return false;
  }

  // ตรวจ ID/FC/ByteCount
  if (resp[0] != 0x01 || resp[1] != 0x03 || resp[2] != 14) return false;

  // ตรวจ CRC
  uint16_t crcCalc = modbusCRC(resp, RESP_LEN - 2);
  uint16_t crcRecv = resp[RESP_LEN - 2] | (resp[RESP_LEN - 1] << 8);
  if (crcCalc != crcRecv) return false;

  // แปลง 7 ค่าจาก data 14 bytes (big-endian)
  for (int i = 0; i < 7; i++) {
    uint8_t hi = resp[3 + 2*i];
    uint8_t lo = resp[3 + 2*i + 1];
    outRegs[i] = (uint16_t)hi << 8 | lo;
  }
  return true;
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
    
    // Upload device info to Firebase (includes type: "sensor")
    if (deviceName.length() > 0 || zone.length() > 0) {
      uploadDeviceInfo(deviceName, zone);
    }
    
    Serial.println("=================================\n");
    Serial.println("✅ Ready to upload sensor data!");
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
  json += "\"type\":\"sensor\",";  // Device type: sensor
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
  int httpCode = 0;
  int result = httpPUT(path, json, &httpCode);
  
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
  
  //Modbus Setup
  pinMode(DE_RE_PIN, OUTPUT);
  digitalWrite(DE_RE_PIN, MODE_RECV);
  Serial2.begin(MODBUS_BAUD, SERIAL_8N1, 27, 26);
  Serial2.setTimeout(200);

  Serial.println("Start RS485 read 7-in-1 (ID=1, 4800, 8N1, FC=0x03, addr0..6)");


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
    Serial.println("\n⚠ Device claim lost. Re-checking...\n");
    waitForDeviceClaim();
    return;
  }

  uint16_t regs[7];
  if (read7Regs(regs)) {
    // สเกลตามที่ร้านนี้ระบุ: soil/10, temp/10, pH/10; EC เป็น uS/cm ตรง ๆ; N,P,K เป็น mg/kg
    float moisture = regs[0] / 10.0f;
    float temp = regs[1] / 10.0f;
    uint16_t ec = regs[2];
    float ph   = regs[3] / 10.0f;
    uint16_t n = regs[4];
    uint16_t p = regs[5];
    uint16_t k = regs[6];

    Serial.printf("📊 Sensor Data: Soil: %.1f%%  Temp: %.1f°C  EC: %u  pH: %.1f  N:%u  P:%u  K:%u\n",
                  moisture, temp, ec, ph, n, p, k);
    // Upload sensor data to Firebase
    uploadSensorData(moisture, temp, ec, ph, n, p, k);
  } else {
    Serial.println("❌ Read FAIL (timeout/CRC/format)");
  }

  // Wait before next upload cycle
  Serial.println("⏳ Waiting 5 seconds before next upload...\n");
  delay(5000);
}

