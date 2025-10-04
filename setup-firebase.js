// Firebase Setup Script
import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 Setting up Firebase for Durian Dashboard...\n');

// Check if Firebase is logged in
try {
    const result = execSync('firebase projects:list', { encoding: 'utf8' });
    console.log('✅ Firebase CLI is ready!');
    console.log('📋 Available projects:');
    console.log(result);
} catch (error) {
    console.log('❌ Firebase not logged in. Please run: firebase login');
    console.log('🔗 This will open a browser window for authentication.');
    process.exit(1);
}

console.log('\n🔧 Next steps:');
console.log('1. Run: firebase init');
console.log('2. Select: Hosting, Firestore, Functions, Storage');
console.log('3. Run: firebase deploy');
console.log('\n📖 See setup-firebase.md for detailed instructions!');
