// Import the functions you need from the SDKs you need
// 🚨 FIX: Using full CDN paths for all modular imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
// Removed getAnalytics import as it's not strictly necessary for auth and might cause issues
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBducRsIau0zyRCKYnvxAKt1BxL1F1wKZY",
  authDomain: "testing-151e6.firebaseapp.com",
  databaseURL: "https://testing-151e6-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "testing-151e6",
  storageBucket: "testing-151e6.firebasestorage.app",
  messagingSenderId: "792418176245",
  appId: "1:792418176245:web:d31dd0ad749a625197c9bc",
  measurementId: "G-6XNY8CRHD6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Disabled for simplicity

// Get Auth instance and export it for use in other modules
export const auth = getAuth(app);

// Also expose globally for non-module scripts
window.firebaseAuth = auth;