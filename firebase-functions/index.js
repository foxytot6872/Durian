// Firebase Cloud Functions for Durian Dashboard

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

// Automated watering system
exports.autoWatering = functions.pubsub.schedule('every 6 hours').onRun(async (context) => {
    console.log('Running automated watering check...');
    
    try {
        // Get all zones
        const zonesSnapshot = await db.collection('zones').get();
        const zones = [];
        zonesSnapshot.forEach(doc => {
            zones.push({ id: doc.id, ...doc.data() });
        });

        for (const zone of zones) {
            // Get latest sensor data for this zone
            const sensorSnapshot = await db.collection('sensorData')
                .where('zoneId', '==', zone.id)
                .where('sensorType', '==', 'moisture')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get();

            if (!sensorSnapshot.empty) {
                const latestReading = sensorSnapshot.docs[0].data();
                
                // If moisture is below 30%, trigger watering
                if (latestReading.value < 30) {
                    console.log(`Low moisture detected in zone ${zone.id}: ${latestReading.value}%`);
                    
                    // Update valve status
                    await db.collection('valveControls').doc(zone.id).set({
                        wateringValve: {
                            isOpen: true,
                            lastToggled: admin.firestore.FieldValue.serverTimestamp(),
                            autoTriggered: true,
                            reason: 'Low moisture detected'
                        }
                    }, { merge: true });

                    // Log the action
                    await db.collection('automatedActions').add({
                        zoneId: zone.id,
                        action: 'watering',
                        reason: 'Low moisture',
                        moistureLevel: latestReading.value,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });

                    console.log(`Auto-watering triggered for zone ${zone.id}`);
                }
            }
        }

        return null;
    } catch (error) {
        console.error('Error in autoWatering function:', error);
        return null;
    }
});

// Disease detection alert
exports.diseaseDetectionAlert = functions.firestore
    .document('diseaseDetection/{detectionId}')
    .onCreate(async (snap, context) => {
        const diseaseData = snap.data();
        
        console.log(`Disease detected: ${diseaseData.diseaseType} in zone ${diseaseData.zoneId}`);
        
        // Send notification to users
        await db.collection('notifications').add({
            type: 'disease_alert',
            zoneId: diseaseData.zoneId,
            diseaseType: diseaseData.diseaseType,
            severity: diseaseData.severity,
            confidence: diseaseData.confidence,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            read: false
        });

        // If severity is high, trigger immediate action
        if (diseaseData.severity === 'critical') {
            // Update zone status
            await db.collection('zones').doc(diseaseData.zoneId).update({
                status: 'critical',
                alertReason: 'Disease detected',
                lastAlert: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Critical disease alert sent for zone ${diseaseData.zoneId}`);
        }

        return null;
    });

// Weather-based irrigation adjustment
exports.weatherBasedIrrigation = functions.pubsub.schedule('every 1 hours').onRun(async (context) => {
    console.log('Running weather-based irrigation adjustment...');
    
    try {
        // Get current weather data
        const weatherDoc = await db.collection('weatherData').doc('current').get();
        
        if (!weatherDoc.exists) {
            console.log('No weather data available');
            return null;
        }

        const weatherData = weatherDoc.data();
        
        // Adjust irrigation based on weather
        let irrigationMultiplier = 1.0;
        
        if (weatherData.rainfall > 10) {
            irrigationMultiplier = 0.5; // Reduce irrigation if raining
        } else if (weatherData.temperature > 35) {
            irrigationMultiplier = 1.5; // Increase irrigation if hot
        } else if (weatherData.humidity < 30) {
            irrigationMultiplier = 1.3; // Increase irrigation if dry
        }

        // Update all zones with weather-adjusted settings
        const zonesSnapshot = await db.collection('zones').get();
        
        for (const zoneDoc of zonesSnapshot.docs) {
            await db.collection('zones').doc(zoneDoc.id).update({
                weatherAdjustment: {
                    multiplier: irrigationMultiplier,
                    appliedAt: admin.firestore.FieldValue.serverTimestamp(),
                    weatherConditions: {
                        temperature: weatherData.temperature,
                        humidity: weatherData.humidity,
                        rainfall: weatherData.rainfall
                    }
                }
            });
        }

        console.log(`Weather-based irrigation adjustment applied: ${irrigationMultiplier}x`);
        return null;
    } catch (error) {
        console.error('Error in weatherBasedIrrigation function:', error);
        return null;
    }
});

// Generate daily analytics
exports.generateDailyAnalytics = functions.pubsub.schedule('0 0 * * *').onRun(async (context) => {
    console.log('Generating daily analytics...');
    
    try {
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        
        // Get all zones
        const zonesSnapshot = await db.collection('zones').get();
        const analytics = {
            date: yesterday,
            zones: {},
            summary: {
                totalZones: zonesSnapshot.size,
                healthyZones: 0,
                warningZones: 0,
                criticalZones: 0
            }
        };

        for (const zoneDoc of zonesSnapshot.docs) {
            const zoneId = zoneDoc.id;
            const zoneData = zoneDoc.data();
            
            // Get sensor data for the day
            const sensorSnapshot = await db.collection('sensorData')
                .where('zoneId', '==', zoneId)
                .where('timestamp', '>=', yesterday)
                .where('timestamp', '<', today)
                .get();

            const sensorReadings = [];
            sensorSnapshot.forEach(doc => {
                sensorReadings.push(doc.data());
            });

            // Calculate averages
            const avgMoisture = sensorReadings
                .filter(r => r.sensorType === 'moisture')
                .reduce((sum, r) => sum + r.value, 0) / sensorReadings.length || 0;

            const avgTemperature = sensorReadings
                .filter(r => r.sensorType === 'temperature')
                .reduce((sum, r) => sum + r.value, 0) / sensorReadings.length || 0;

            // Determine zone health
            let healthStatus = 'healthy';
            if (avgMoisture < 30 || avgTemperature > 40) {
                healthStatus = 'critical';
                analytics.summary.criticalZones++;
            } else if (avgMoisture < 50 || avgTemperature > 35) {
                healthStatus = 'warning';
                analytics.summary.warningZones++;
            } else {
                analytics.summary.healthyZones++;
            }

            analytics.zones[zoneId] = {
                healthStatus,
                avgMoisture,
                avgTemperature,
                readingCount: sensorReadings.length
            };
        }

        // Save analytics
        await db.collection('analytics').doc(`daily_${yesterday.toISOString().split('T')[0]}`).set(analytics);
        
        console.log('Daily analytics generated successfully');
        return null;
    } catch (error) {
        console.error('Error generating daily analytics:', error);
        return null;
    }
});

// Clean up old sensor data
exports.cleanupOldData = functions.pubsub.schedule('0 2 * * *').onRun(async (context) => {
    console.log('Cleaning up old sensor data...');
    
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Delete old sensor data
        const oldSensorData = await db.collection('sensorData')
            .where('timestamp', '<', thirtyDaysAgo)
            .limit(1000)
            .get();

        const batch = db.batch();
        oldSensorData.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        console.log(`Cleaned up ${oldSensorData.docs.length} old sensor records`);
        return null;
    } catch (error) {
        console.error('Error cleaning up old data:', error);
        return null;
    }
});

// HTTP function for manual zone control
exports.controlZone = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { zoneId, action, settings } = data;
    
    try {
        switch (action) {
            case 'water':
                await db.collection('valveControls').doc(zoneId).set({
                    wateringValve: {
                        isOpen: true,
                        lastToggled: admin.firestore.FieldValue.serverTimestamp(),
                        manualControl: true,
                        settings: settings
                    }
                }, { merge: true });
                break;
                
            case 'fertilize':
                await db.collection('valveControls').doc(zoneId).set({
                    fertilizerValve: {
                        isOpen: true,
                        lastToggled: admin.firestore.FieldValue.serverTimestamp(),
                        manualControl: true,
                        settings: settings
                    }
                }, { merge: true });
                break;
                
            case 'pest_control':
                await db.collection('valveControls').doc(zoneId).set({
                    pestControlValve: {
                        isOpen: true,
                        lastToggled: admin.firestore.FieldValue.serverTimestamp(),
                        manualControl: true,
                        settings: settings
                    }
                }, { merge: true });
                break;
                
            default:
                throw new functions.https.HttpsError('invalid-argument', 'Invalid action');
        }

        return { success: true, message: `${action} activated for zone ${zoneId}` };
    } catch (error) {
        console.error('Error controlling zone:', error);
        throw new functions.https.HttpsError('internal', 'Failed to control zone');
    }
});
