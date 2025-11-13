// Firebase Configuration for Durian Dashboard
// Replace these values with your actual Firebase project configuration

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "duriandashboard.firebaseapp.com",
  projectId: "duriandashboard",
  storageBucket: "duriandashboard.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE"
};

// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
