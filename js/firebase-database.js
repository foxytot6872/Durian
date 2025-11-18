// Firebase Database Manager for Durian Dashboard
import { db } from './firebase-config.js';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class FirestoreManager {
  constructor() {
    this.db = db;
  }

  // Zone Data Management
  async addZoneData(zoneId, data) {
    try {
      const docRef = await addDoc(collection(this.db, 'zones'), {
        zoneId: zoneId,
        ...data,
        timestamp: serverTimestamp()
      });
      console.log('Zone data added with ID: ', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding zone data: ', error);
      throw error;
    }
  }

  // Sensor Data Management
  async addSensorData(zoneId, sensorData) {
    try {
      const docRef = await addDoc(collection(this.db, 'sensorData'), {
        zoneId: zoneId,
        moisture: sensorData.moisture,
        temperature: sensorData.temperature,
        humidity: sensorData.humidity,
        ph: sensorData.ph || null,
        light: sensorData.light || null,
        timestamp: serverTimestamp()
      });
      console.log('Sensor data added with ID: ', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding sensor data: ', error);
      throw error;
    }
  }

  // Valve Control Management
  async updateValveStatus(zoneId, valveType, status) {
    try {
      const valveRef = doc(this.db, 'valveControl', `${zoneId}_${valveType}`);
      await updateDoc(valveRef, {
        zoneId: zoneId,
        valveType: valveType,
        status: status,
        lastUpdated: serverTimestamp()
      });
      console.log(`Valve ${valveType} for zone ${zoneId} updated to ${status}`);
    } catch (error) {
      console.error('Error updating valve status: ', error);
      throw error;
    }
  }

  // Real-time Data Listeners
  setupRealtimeListener(collectionName, callback) {
    const q = query(collection(this.db, collectionName), orderBy('timestamp', 'desc'), limit(10));
    
    return onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      callback(data);
    });
  }

  // Zone-specific real-time listener
  setupZoneListener(zoneId, callback) {
    const q = query(
      collection(this.db, 'sensorData'), 
      where('zoneId', '==', zoneId),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        callback({ id: doc.id, ...doc.data() });
      }
    });
  }

  // Get latest sensor data for all zones
  async getLatestSensorData() {
    try {
      const zones = ['A', 'B', 'C', 'D'];
      const data = {};
      
      for (const zone of zones) {
        const q = query(
          collection(this.db, 'sensorData'),
          where('zoneId', '==', zone),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          data[zone] = { id: doc.id, ...doc.data() };
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error getting latest sensor data: ', error);
      throw error;
    }
  }
}

// Export the manager
export const firestoreManager = new FirestoreManager();
