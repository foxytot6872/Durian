# Complete Device Claiming & Sensor Upload System

## Overview
This document describes the complete architecture for ESP32 devices sending sensor data to Firebase Realtime Database, but only after being claimed by a user through the web dashboard.

---

## 🔥 Device Identification

### Format
- **Device ID**: `esp32_<12 hex characters>`
- **Source**: MAC address of ESP32

### Example
```
MAC Address: 28:56:2F:68:68:DC
Processing: Remove colons → 28562F6868DC → Uppercase
Device ID: esp32_28562F6868DC
```

### ESP32 Implementation
```cpp
String getDeviceID() {
  String mac = WiFi.macAddress();
  mac.replace(":", "");   // Remove all colons
  mac.toUpperCase();     // Convert to uppercase
  return "esp32_" + mac;
}
```

---

## 🔥 Device Registry (Root Node)

### Path
```
/device_registry/<deviceId>/
```

### Structure
```json
{
  "owner_uid": "<Firebase Auth UID>",
  "claimed": true,
  "name": "<Custom device name>",
  "zone": "<Zone A / B / C>",
  "firmware_version": "1.0.0",
  "claimed_at": <timestamp>
}
```

### Example
```
/device_registry/esp32_28562F6868DC/
  owner_uid: "3O1jlnF2xUQqS6A2DMfiY7zK79o2"
  claimed: true
  name: "Zone A Sensor"
  zone: "Zone A"
  firmware_version: "1.0.0"
  claimed_at: 1704067200000
```

### Status
- **Node doesn't exist** → Device is UNCLAIMED
- **Node exists with owner_uid** → Device is CLAIMED

---

## 🔥 Dashboard Device Claim Page

### User Input
1. **deviceId** (must match `esp32_XXXXXXXXXXXX` format)
2. **deviceName** (custom name)
3. **zone** (Zone A, B, or C)

### Claim Process

#### Step 1: Check Device Status
```javascript
GET /device_registry/<deviceId>.json?auth=<idToken>
```

**Responses:**
- `null` → Device doesn't exist, allow registration
- `{owner_uid: "other_uid", ...}` → Device already owned by another user
- `{owner_uid: currentUser.uid, ...}` → Device already claimed by you

#### Step 2: Write to Device Registry
```javascript
PUT /device_registry/<deviceId>.json?auth=<idToken>
{
  owner_uid: currentUser.uid,
  claimed: true,
  name: deviceName,
  zone: zone,
  firmware_version: "1.0.0",
  claimed_at: timestamp
}
```

#### Step 3: Write to User's Device List
```javascript
PUT /users/<uid>/devices/<deviceId>/device_info.json?auth=<idToken>
{
  device_id: deviceId,
  name: deviceName,
  zone: zone,
  firmware_version: "1.0.0",
  last_online: 0
}
```

---

## 🔥 ESP32 Claim Verification

### Process (on startup)

1. **Generate Device ID**
   ```cpp
   deviceId = getDeviceID();  // esp32_28562F6868DC
   ```

2. **Check Claim Status**
   ```cpp
   GET https://<db>/device_registry/<deviceId>.json
   ```

3. **Handle Response**
   - **Response == `null`**: Device not claimed
     - Print: "Device not claimed"
     - Retry every 5 seconds
   - **Response contains `owner_uid`**: Device is claimed
     - Save `ownerUid = response.owner_uid`
     - Proceed to sensor upload

### Implementation
```cpp
void waitForDeviceClaim() {
  while (true) {
    String url = FIREBASE_URL + "/device_registry/" + deviceId + ".json";
    String response = httpGET(url);
    
    if (response == "null") {
      Serial.println("⚠ Device NOT CLAIMED. Waiting...");
      delay(5000);
      continue;
    }
    
    // Parse JSON
    DynamicJsonDocument doc(512);
    deserializeJson(doc, response);
    
    if (doc.containsKey("owner_uid")) {
      ownerUid = doc["owner_uid"].as<String>();
      break;  // Device claimed, proceed
    }
    
    delay(5000);
  }
}
```

---

## 🔥 ESP32 Sensor Data Upload

### Path
```
/users/<ownerUid>/devices/<deviceId>/sensor_data
```

### Method
```
PUT /users/<ownerUid>/devices/<deviceId>/sensor_data.json
```

### JSON Structure
```json
{
  "moisture": <float>,
  "temperature": <float>,
  "ec": <int>,
  "ph": <float>,
  "n": <int>,
  "p": <int>,
  "k": <int>,
  "timestamp": <millis()>
}
```

### Implementation
```cpp
void uploadSensorData(float moisture, float temp, int ec, float ph, int n, int p, int k) {
  if (ownerUid.length() == 0) {
    Serial.println("❌ ERROR: ownerUid is empty. Cannot upload.");
    return;
  }
  
  String path = FIREBASE_URL;
  path += "/users/" + ownerUid + "/devices/" + deviceId + "/sensor_data.json";
  
  String json = "{";
  json += "\"moisture\":" + String(moisture) + ",";
  json += "\"temperature\":" + String(temp) + ",";
  json += "\"ec\":" + String(ec) + ",";
  json += "\"ph\":" + String(ph) + ",";
  json += "\"n\":" + String(n) + ",";
  json += "\"p\":" + String(p) + ",";
  json += "\"k\":" + String(k) + ",";
  json += "\"timestamp\":" + String(millis());
  json += "}";
  
  httpPUT(path, json);
}
```

---

## 🔥 Security Rules

### Principles
1. **Device can only write inside its own deviceId path**
2. **Users can only see devices they own**
3. **No user can see another user's devices**

### Firebase Rules Structure

#### Device Registry
- `claimed` and `owner_uid`: Publicly readable (for ESP32 claim checking)
- Full device data: Only owner can read
- Write: Only authenticated users can claim (must set their UID as owner)

#### User Data
- `device_info`: Requires authentication (only owner can read/write)
- `sensor_data`: Publicly writable (ESP32 can upload), but only owner can read
- Other fields: Require authentication

### Security Model
- **Device IDs are unique** (based on MAC address)
- **ESP32 only knows its own deviceId**
- **Path structure ensures isolation**: `/users/{uid}/devices/{deviceId}/sensor_data`
- **Only the device with that specific deviceId can write to that path**

---

## 🔥 Database Structure

```
/device_registry/
  esp32_28562F6868DC/
    owner_uid: "3O1jlnF2xUQqS6A2DMfiY7zK79o2"
    claimed: true
    name: "Zone A Sensor"
    zone: "Zone A"
    firmware_version: "1.0.0"
    claimed_at: 1704067200000

/users/
  3O1jlnF2xUQqS6A2DMfiY7zK79o2/
    devices/
      esp32_28562F6868DC/
        device_info/
          device_id: "esp32_28562F6868DC"
          name: "Zone A Sensor"
          zone: "Zone A"
          firmware_version: "1.0.0"
          last_online: 0
        sensor_data/
          moisture: 25.3
          temperature: 30.1
          ec: 890
          ph: 6.4
          n: 11
          p: 6
          k: 8
          timestamp: 1234567890
```

---

## 🔥 Validation Rules

### Device ID Format
- Must match: `/^esp32_[A-Za-z0-9]{12}$/`
- Example: `esp32_28562F6868DC` ✅
- Invalid: `esp32_28562f6868dc` (lowercase) ❌
- Invalid: `esp32_28562F6868D` (11 chars) ❌

### Claim Validation
1. Device ID format validation
2. Check if device exists in registry
3. Check if already owned by another user
4. Check if already owned by current user
5. Validate device name and zone

---

## 🔥 Error Handling

### Dashboard Errors
- "Device ID must match format: esp32_XXXXXXXXXXXX"
- "This device is already owned by another user"
- "This device is already claimed by you"
- "Failed to register device in registry"
- "Failed to register device to user account"

### ESP32 Errors
- "Device NOT CLAIMED. Waiting for user to claim..."
- "Device exists but NOT assigned to a user. Waiting..."
- "owner_uid is empty. Cannot upload."
- JSON parse errors with retry logic

---

## 🔥 Files

### Web Dashboard
- `device-claim.html` - Device claiming interface
- `js/firebase-config.js` - Firebase configuration

### ESP32 Firmware
- `esp32_device_claim.ino` - Complete ESP32 code

### Firebase Rules
- `firebase-database-rules.json` - Security rules

---

## 🔥 Testing Checklist

- [ ] ESP32 generates correct device ID format
- [ ] Dashboard validates device ID format
- [ ] Dashboard checks device existence correctly
- [ ] Dashboard prevents claiming already-owned devices
- [ ] Dashboard writes to both device_registry and user devices
- [ ] ESP32 detects unclaimed device correctly
- [ ] ESP32 detects claimed device and extracts owner_uid
- [ ] ESP32 uploads sensor data to correct path
- [ ] Security rules prevent unauthorized access
- [ ] Users can only see their own devices

