# 🔧 Device Removal Functionality Guide

## Current Status

**Device removal is NOT currently implemented in the codebase.**

## What Would Be Removed

If you remove a device from a user, the following data would be deleted:

### 1. User Device Data
- `/users/<uid>/devices/<deviceId>/device_info/` - Device metadata (name, zone, firmware version)
- `/users/<uid>/devices/<deviceId>/sensor_data/` - Current sensor readings
- `/users/<uid>/devices/<deviceId>/camera_feeds/` - Camera feed URLs (for Pi devices)

### 2. Device Registry
- `/device_registry/<deviceId>/` - Ownership record (owner_uid, claimed status)

## Impact on User

### ✅ User Account
- **Status:** Completely unaffected
- User account remains active
- User can still log in
- User profile unchanged

### ✅ Other Devices
- **Status:** Completely unaffected
- Other devices continue working
- Other sensor data remains intact
- Other camera feeds continue working

### ⚠️ Removed Device
- Device disappears from dashboard
- Historical sensor data is lost (if you want to keep it, export first)
- Device can be re-claimed later (if it's still active)
- Camera feeds stop appearing

### ⚠️ Data Loss Warning
- **Sensor data history** will be permanently deleted
- **No automatic backup** is created
- Consider exporting data before removal if needed for records

## Implementation Options

### Option 1: Soft Delete (Recommended)
Keep the device data but mark it as "removed":
- Add `removed: true` flag to device_info
- Hide device from dashboard
- Keep historical data for records
- Can be restored later

### Option 2: Hard Delete
Permanently delete all device data:
- Remove device from `/users/<uid>/devices/<deviceId>/`
- Remove from `/device_registry/<deviceId>/`
- Data cannot be recovered

### Option 3: Transfer Ownership
Instead of deleting, transfer to another user:
- Change `owner_uid` in device_registry
- Move data to new user's path
- Device continues working with new owner

## Recommended Implementation

I can implement device removal functionality for you. Here's what it would include:

### Features:
1. **Remove Device Button** in Settings page
2. **Confirmation Dialog** to prevent accidental deletion
3. **Choice:** Soft delete (keep data) or Hard delete (remove completely)
4. **Cleanup:** Remove device from Firebase (both paths)
5. **UI Update:** Dashboard refreshes automatically

### Safety Features:
- Confirmation dialog ("Are you sure?")
- Option to export data before deletion
- Cannot remove device without authentication
- Only owner can remove their device

Would you like me to implement this functionality?

