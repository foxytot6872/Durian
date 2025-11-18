/**
 * Firebase Auth State Sync Module
 * 
 * This module syncs Firebase authentication state with localStorage authService
 * to ensure both systems stay in sync when pages load.
 * 
 * This should be loaded on protected pages after firebase-config.js and auth-service.js
 */

(async function() {
    'use strict';

    // Only run on protected pages (not login/register)
    const currentPage = window.location.pathname.split('/').pop() || window.location.pathname;
    const publicPages = ['login.html', 'register.html', '404.html'];
    if (publicPages.some(page => currentPage.includes(page))) {
        return;
    }

    // Wait for authService to be available
    if (typeof window.authService === 'undefined') {
        console.warn('auth-service.js not loaded, skipping Firebase auth sync');
        return;
    }

    try {
        // Check if Firebase auth is available (either from global or module)
        let auth = null;
        let onAuthStateChanged = null;
        
        // Try to get from global first (set by firebase-config.js)
        if (window.firebaseAuth) {
            auth = window.firebaseAuth;
            // Import onAuthStateChanged
            const authModule = await import('https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js');
            onAuthStateChanged = authModule.onAuthStateChanged;
        } else {
            // Try to import from module
            try {
                const authModule = await import('./firebase-config.js');
                auth = authModule.auth;
                const firebaseAuthModule = await import('https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js');
                onAuthStateChanged = firebaseAuthModule.onAuthStateChanged;
            } catch (e) {
                console.warn('Could not import Firebase auth module');
            }
        }
        
        if (!auth || !onAuthStateChanged) {
            console.warn('Firebase auth not available, skipping sync');
            return;
        }

        // Use onAuthStateChanged to wait for auth state and sync
        onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // Firebase user is logged in, sync with localStorage
                const currentLocalUser = window.authService.getCurrentUser();
                
                // Only sync if localStorage doesn't have user or user IDs don't match
                if (!currentLocalUser || currentLocalUser.id !== firebaseUser.uid) {
                    const userSession = {
                        id: firebaseUser.uid,
                        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                        email: firebaseUser.email || '',
                        signedInAt: new Date().toISOString()
                    };
                    
                    // Check if user was previously remembered (check localStorage first)
                    const wasRemembered = localStorage.getItem('durianActiveUser') !== null;
                    window.authService.setActiveUser(userSession, wasRemembered);
                    
                    console.log('✅ Firebase auth state synced with localStorage');
                }
            } else {
                // Firebase user is not logged in, clear localStorage if it has user
                const currentLocalUser = window.authService.getCurrentUser();
                if (currentLocalUser) {
                    console.log('⚠️ Firebase auth not active but localStorage has user, clearing localStorage');
                    window.authService.logoutUser();
                }
            }
        });
    } catch (error) {
        // If Firebase modules can't be loaded, that's okay - auth.js will handle sync on login
        console.warn('Could not sync Firebase auth state:', error.message);
    }
})();

