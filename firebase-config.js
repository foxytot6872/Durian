// Firebase Configuration
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
firebase.initializeApp(firebaseConfig);

// Get Firebase Database
const database = firebase.database();
