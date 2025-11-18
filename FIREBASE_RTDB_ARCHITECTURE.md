# Firebase Realtime Database Architecture
## Durian Farm Dashboard + ESP32 IoT System

**Last Updated:** Based on complete system specification  
**Purpose:** Complete reference for all database operations, validation, and code development

---

## 🔥 ROOT LEVEL OVERVIEW

The database has **two major root nodes**:

1. **`/users`** → Stores user-specific devices + sensor data
2. **`/device_registry`** → Stores all ESP32 devices and ownership information

These two nodes work together to connect:
- ESP32 device (hardware)
- Firebase user (account)
- Dashboard (HTML/JS)

---

## 🔥 NODE 1: /device_registry/

### Purpose
This is where **every ESP32 device is registered**. It determines:
- Whether an ESP32 is claimed or unclaimed
- Which user owns the device
- Prevents unauthorized devices from uploading data

### Path Structure
```
/device_registry/<deviceId>/
```

### Device ID Format
**CRITICAL:** Device ID MUST match format:
```
esp32_<12 hex characters>
```

**Example:**
- MAC Address: `28:56:2F:68:68:DC`
- Remove colons: `28562F6868DC`
- Uppercase: `28562F6868DC`
- Prepend: `esp32_28562F6868DC`

**Validation Pattern:** `/^esp32_[A-Z0-9]{12}$/`

### Data Structure
```json
{
  "owner_uid": "<Firebase Auth UID>",
  "claimed": true,
  "name": "<Device display name>",
  "zone": "<Zone A / Zone B / Zone C>",
  "firmware_version": "1.0.0"
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
```

### Status Logic
- **Node doesn't exist** → Device is **UNCLAIMED**
- **Node exists with `owner_uid`** → Device is **CLAIMED**

### ESP32 Behavior
ESP32 **MUST** check this node **BEFORE** uploading any sensor data.

---

## 🔥 NODE 2: /users/

### Purpose
Each Firebase Auth user has their own root node containing:
- Device metadata (`device_info`)
- Live sensor data (`sensor_data`)

### Path Structure
```
/users/<uid>/
  /devices/
    /<deviceId>/
      /device_info/
      /sensor_data/
```

---

## 🔥 SUB-NODE 1: device_info

### Path
```
/users/<uid>/devices/<deviceId>/device_info/
```

### Data Structure
```json
{
  "device_id": "<deviceId>",
  "name": "<Device display name>",
  "zone": "<Zone A / Zone B / Zone C>",
  "firmware_version": "1.0.0",
  "last_online": 0
}
```

### Purpose
- For dashboard to list devices
- For the user to manage device settings
- For future features like renaming devices
- Track when device was last online

### Example
```
/users/3O1jlnF2xUQqS6A2DMfiY7zK79o2/devices/esp32_28562F6868DC/device_info/
  device_id: "esp32_28562F6868DC"
  name: "Zone A Sensor"
  zone: "Zone A"
  firmware_version: "1.0.0"
  last_online: 0
```

---

## 🔥 SUB-NODE 2: sensor_data

### Path
```
/users/<uid>/devices/<deviceId>/sensor_data/
```

### Data Structure
```json
{
  "moisture": <number>,
  "temperature": <number>,
  "ec": <number>,
  "ph": <number>,
  "n": <number>,
  "p": <number>,
  "k": <number>,
  "timestamp": <epoch_millis>
}
```

### Purpose
- Stores the **live sensor data** uploaded by the ESP32
- Dashboard reads this to show **real-time values**
- Overwrites previous data (PUT operation)

### Example
```
/users/3O1jlnF2xUQqS6A2DMfiY7zK79o2/devices/esp32_28562F6868DC/sensor_data/
  moisture: 25.3
  temperature: 30.1
  ec: 890
  ph: 6.4
  n: 11
  p: 6
  k: 8
  timestamp: 1704067200000
```

---

## 🔥 COMPLETE PATH SUMMARY

```
/device_registry/
  /<deviceId>/
    owner_uid
    claimed
    name
    zone
    firmware_version

/users/
  /<uid>/
    /devices/
      /<deviceId>/
        /device_info/
          device_id
          name
          zone
          firmware_version
          last_online
        /sensor_data/
          moisture
          temperature
          ec
          ph
          n
          p
          k
          timestamp
```

---

## 🔥 SYSTEM FLOW

### 1. ESP32 Boot Sequence
```
ESP32 boots
  ↓
Generates deviceId from MAC address
  ↓
Queries: GET /device_registry/<deviceId>.json
```

### 2. Device Claim Check
```
If response == null:
  → Device is UNCLAIMED
  → ESP32 waits (retry every 5 seconds)
  → Display: "Device NOT CLAIMED. Waiting for user to claim…"

If response contains owner_uid:
  → Device is CLAIMED
  → Save ownerUid
  → Proceed to sensor upload
```

### 3. User Claims Device (Dashboard)
```
User enters:
  - deviceId (esp32_XXXXXXXXXXXX)
  - deviceName
  - zone

Dashboard:
  1. Validates deviceId format
  2. Checks if device exists in device_registry
  3. If null → allow registration
  4. If owner_uid exists & != currentUser.uid → "Device already owned"
  5. If owner_uid == currentUser.uid → "Device already claimed"
  6. If allowed → write to:
     - PUT /device_registry/<deviceId>.json?auth=<idToken>
     - PUT /users/<uid>/devices/<deviceId>/device_info.json?auth=<idToken>
```

### 4. ESP32 Uploads Sensor Data
```
Once claimed, ESP32 uploads to:
  PUT /users/<ownerUid>/devices/<deviceId>/sensor_data.json

With JSON:
  {
    moisture: <value>,
    temperature: <value>,
    ec: <value>,
    ph: <value>,
    n: <value>,
    p: <value>,
    k: <value>,
    timestamp: <millis()>
  }
```

### 5. Dashboard Displays Data
```
Dashboard reads:
  GET /users/<uid>/devices/<deviceId>/sensor_data.json?auth=<idToken>

Displays real-time sensor values
```

---

## 🔥 VALIDATION RULES

### Device ID Format
- **Pattern:** `/^esp32_[A-Z0-9]{12}$/`
- **Length:** Exactly 19 characters (`esp32_` + 12 hex chars)
- **Case:** Uppercase hex characters
- **Example Valid:** `esp32_28562F6868DC`
- **Example Invalid:** 
  - `esp32_28562f6868dc` (lowercase)
  - `esp32_28562F6868D` (11 chars)
  - `ESP32_28562F6868DC` (uppercase prefix)

### Zone Values
- Must be one of: `"Zone A"`, `"Zone B"`, `"Zone C"`

### Sensor Data Types
- `moisture`: float
- `temperature`: float
- `ec`: integer
- `ph`: float
- `n`: integer
- `p`: integer
- `k`: integer
- `timestamp`: integer (milliseconds since epoch)

---

## 🔥 SECURITY CONSIDERATIONS

### Device Registry
- `claimed` and `owner_uid`: Publicly readable (for ESP32 claim checking)
- Full device data: Only owner can read
- Write: Only authenticated users can claim (must set their UID as owner)

### User Data
- `device_info`: Requires authentication (only owner can read/write)
- `sensor_data`: Publicly writable (ESP32 can upload), but only owner can read
- Other fields: Require authentication

### Security Model
- **Device IDs are unique** (based on MAC address)
- **ESP32 only knows its own deviceId**
- **Path structure ensures isolation**: `/users/{uid}/devices/{deviceId}/sensor_data`
- **Only the device with that specific deviceId can write to that path**

---

## 🔥 API ENDPOINTS REFERENCE

### Device Registry
```
GET  /device_registry/<deviceId>.json
     → Check if device is claimed (ESP32)

PUT  /device_registry/<deviceId>.json?auth=<idToken>
     → Claim device (Dashboard)
```

### User Devices
```
GET  /users/<uid>/devices/<deviceId>/device_info.json?auth=<idToken>
     → Get device metadata (Dashboard)

PUT  /users/<uid>/devices/<deviceId>/device_info.json?auth=<idToken>
     → Update device info (Dashboard)

PUT  /users/<uid>/devices/<deviceId>/sensor_data.json
     → Upload sensor data (ESP32, no auth required)
```

---

## 🔥 USAGE IN CODE

### ESP32
- Generate deviceId: `esp32_<MAC without colons, uppercase>`
- Check claim: `GET /device_registry/<deviceId>.json`
- Upload data: `PUT /users/<ownerUid>/devices/<deviceId>/sensor_data.json`

### Dashboard (JavaScript)
- Validate deviceId: `/^esp32_[A-Z0-9]{12}$/`
- Check device: `GET /device_registry/<deviceId>.json?auth=<idToken>`
- Claim device: `PUT /device_registry/<deviceId>.json?auth=<idToken>`
- Read sensor data: `GET /users/<uid>/devices/<deviceId>/sensor_data.json?auth=<idToken>`

### Firebase Rules
- Allow ESP32 to read `claimed` and `owner_uid` from device_registry
- Allow ESP32 to write to `sensor_data` (no auth)
- Require auth for all user data reads
- Require auth for device claiming

---

## 🔥 NOTES FOR DEVELOPMENT

1. **Always validate deviceId format** before database operations
2. **Always use `?auth=<idToken>`** for authenticated requests
3. **ESP32 never uses authentication** (reads public fields, writes to sensor_data)
4. **Dashboard always uses authentication** (reads/writes user data)
5. **Device ID generation must be consistent** (MAC → uppercase, no colons)
6. **Sensor data overwrites** (PUT operation, not append)
7. **Check device_registry first** before allowing claims
8. **Both nodes must be updated** when claiming a device

---

**This document serves as the single source of truth for all Firebase RTDB operations in the Durian Farm Dashboard system.**

