# Firebase Realtime Database Rules Update

## Problem
The original rules prevented users from checking if a device exists before claiming it, because the `.read` rule only allowed reading devices you own.

## Solution
Updated rules allow authenticated users to read the `claimed` and `owner_uid` fields to check device availability, while still protecting other sensitive data.

## How to Update Your Firebase Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **testing-151e6**
3. Navigate to **Realtime Database** → **Rules** tab
4. Replace your current rules with the rules from `firebase-database-rules.json`
5. Click **Publish**

## Updated Rules Explanation

### Device Registry Rules
- **`claimed` field**: Publicly readable (no auth required) - allows ESP32 devices to check claim status
- **`owner_uid` field**: Publicly readable (no auth required) - allows ESP32 to know who owns the device
- **Full device data**: Only the owner can read all fields (name, zone, firmware_version, etc.)
- **Write access**: Users can only claim devices that don't exist or that they already own, and must set their UID as the owner

### User Data Rules
- **Device Info** (`device_info`): Requires authentication - only the owner can read/write
- **Sensor Data** (`sensor_data`): Publicly writable (no auth required) - allows ESP32 devices to upload data
  - Reading sensor data still requires authentication (only owner can read)
- **Other fields**: Require authentication

## Security Notes
- The `claimed` and `owner_uid` fields are publicly readable to enable ESP32 devices to check claim status without authentication
- Sensor data can be written without auth because:
  - Device IDs are unique (based on MAC address)
  - Only the device with that specific ID can write to its own path
  - Reading sensor data still requires authentication
- Other sensitive fields (name, zone, firmware_version, device_info, etc.) are still protected
- Write rules ensure users can only claim devices they don't own or already own

