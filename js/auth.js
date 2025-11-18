/**
 * Authentication UI Handler
 * This file uses the modern Modular (v9+) Firebase SDK.
 * It is loaded as a module in the HTML and imports necessary functions.
 * * IMPORTANT: This script requires 'js/firebase-config.js' to be present 
 * in the same directory and must export the initialized 'auth' object.
 */

'use strict';

// 1. Import necessary Firebase Authentication functions directly from the SDKs (via CDN)
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// 2. Import the initialized auth object from your config file (REQUIRED)
import { auth } from './firebase-config.js';

(function () {
    console.log('--- auth.js script starting execution ---');

    // --- CRITICAL CHECK: Ensure Firebase Auth object is available ---
    if (!auth) {
        console.error('FATAL ERROR: Firebase Auth object is undefined. Check if firebase-config.js is correctly exporting "auth" and that its path is correct.');
        return;
    }
    console.log('Firebase Auth object successfully imported.');
    // -----------------------------------------------------------------

    const authPage = document.body.dataset.authPage;
    const feedbackEl = document.querySelector('.auth-feedback');

    /**
     * Show feedback message to user
     */
    const showFeedback = (message, type = 'success') => {
        if (!feedbackEl) return;
        feedbackEl.textContent = message;
        feedbackEl.classList.remove('success', 'error', 'show');
        feedbackEl.classList.add(type, 'show');
        console.log(`FEEDBACK DISPLAYED: [${type.toUpperCase()}] ${message}`); // Debug log
    };

    /**
     * Clear feedback message
     */
    const clearFeedback = () => {
        if (!feedbackEl) return;
        feedbackEl.textContent = '';
        feedbackEl.classList.remove('success', 'error', 'show');
    };

    /**
     * Sanitize input value
     */
    const sanitize = (value = '') => value.trim();

    /**
     * Redirect with delay
     */
    const redirectWithDelay = (url, delay = 1500) => {
        setTimeout(() => {
            window.location.href = url;
        }, delay);
    };

    // ==========================================================
    // ========== GOOGLE AUTH HANDLER (Pop-up flow) =============
    // ==========================================================
    // NOTE: Persistence setting is removed from here to ensure signInWithPopup 
    // runs synchronously with the click event to avoid pop-up blocking issues.
    const handleGoogleSignIn = async () => {
        clearFeedback();
        const googleBtn = document.querySelector('.auth-google');
        // Immediately disable the button on click
        googleBtn.disabled = true;

        try {
            // 1. Create Google Auth Provider
            const provider = new GoogleAuthProvider();

            // 2. Sign in with popup. This must be run in the synchronous click context.
            // Persistence defaults to SESSION for popups.
            const result = await signInWithPopup(auth, provider);
            const firebaseUser = result.user;

            // User successfully signed in
            console.log('Google Sign-In successful:', firebaseUser.email);

            // Sync Firebase auth with localStorage authService for route protection
            if (window.authService && firebaseUser) {
                const userSession = {
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                    email: firebaseUser.email || '',
                    signedInAt: new Date().toISOString()
                };
                // Google sign-in defaults to session persistence
                window.authService.setActiveUser(userSession, false);
                console.log('✅ Google auth synced with authService');
            }

            showFeedback('Signed in with Google! Redirecting to dashboard…', 'success');
            redirectWithDelay('index.html');

        } catch (error) {
            let message = 'An unknown error occurred during Google sign-in.';
            console.error('Google Sign-In Error:', error);

            // Handle specific errors
            if (error.code === 'auth/popup-closed-by-user') {
                message = 'Sign-in window closed. Please try again.';
            } else if (error.code === 'auth/cancelled-popup-request') {
                message = 'Another sign-in request is already in progress.';
            } else if (error.code === 'auth/operation-not-allowed') {
                message = 'Google Sign-In is not enabled in your Firebase Console.';
            } else {
                message = error.message;
            }

            showFeedback(message, 'error');
        } finally {
            // Re-enable the button
            googleBtn.disabled = false;
        }
    };

    // Attach Google handler if the button is present
    const googleAuthButton = document.querySelector('.auth-google');
    if (googleAuthButton) {
        googleAuthButton.addEventListener('click', handleGoogleSignIn);
    }
    // ==========================================================

    // ========== REGISTER PAGE HANDLER (Firebase Modular) ==========
    if (authPage === 'register') {
        const registerForm = document.getElementById('register-form');

        if (!registerForm) {
            console.error('Registration form element (#register-form) not found!');
            return;
        }

        console.log('Registration listener attaching...');

        registerForm.addEventListener('submit', async (event) => {
            console.log('Form submitted. Preventing default behavior...');
            event.preventDefault(); // <-- This must execute to prevent the refresh
            clearFeedback();

            const submitBtn = registerForm.querySelector('.auth-submit');
            submitBtn.disabled = true;

            // Get form values
            const nameInput = registerForm.querySelector('[name="name"]');
            const emailInput = registerForm.querySelector('[name="email"]');
            const passwordInput = registerForm.querySelector('[name="password"]');
            const termsInput = registerForm.querySelector('[name="terms"]');

            const name = sanitize(nameInput ? nameInput.value : '');
            const email = sanitize(emailInput ? emailInput.value : '');
            const password = sanitize(passwordInput ? passwordInput.value : '');
            const termsAccepted = termsInput ? termsInput.checked : false;

            // Client-side validation
            if (!name || !email || !password) {
                showFeedback('Please complete all fields.', 'error');
                submitBtn.disabled = false;
                return;
            }

            if (!termsAccepted) {
                showFeedback('Please agree to the terms and privacy policy.', 'error');
                submitBtn.disabled = false;
                return;
            }

            if (password.length < 6) {
                showFeedback('Password must be at least 6 characters long.', 'error');
                submitBtn.disabled = false;
                return;
            }
            console.log('Client-side validation passed. Starting Firebase creation...');
            // End Client-side validation

            try {
                // Firebase Modular: Create user
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);

                // Firebase Modular: Update user's profile to include the name
                await updateProfile(userCredential.user, {
                    displayName: name
                });

                // Registration successful
                registerForm.reset();
                showFeedback('Account created successfully! Redirecting to sign in…', 'success');

                redirectWithDelay('login.html');

            } catch (error) {
                // Firebase Error Handling 
                let message = 'An unknown error occurred during registration.';
                console.error('Firebase Registration Error:', error);

                switch (error.code) {
                    case 'auth/email-already-in-use':
                        message = 'This email is already associated with an account.';
                        break;
                    case 'auth/invalid-email':
                        message = 'The email address is not valid.';
                        break;
                    case 'auth/weak-password':
                        message = 'The password is too weak. Choose a stronger one.';
                        break;
                    default:
                        message = error.message;
                        break;
                }

                showFeedback(message, 'error');
            } finally {
                // Ensure button is re-enabled
                submitBtn.disabled = false;
            }
        });
    }

    // ========== LOGIN PAGE HANDLER (Firebase Modular) ==========
    if (authPage === 'login') {
        const loginForm = document.getElementById('login-form');
        if (!loginForm) {
            console.error('Login form not found!');
            return;
        }

        const forgotPasswordLink = document.querySelector('.auth-link');

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            clearFeedback();

            const submitBtn = loginForm.querySelector('.auth-submit');
            submitBtn.disabled = true;

            // Get form values
            const emailInput = loginForm.querySelector('[name="email"]');
            const passwordInput = loginForm.querySelector('[name="password"]');
            const rememberInput = loginForm.querySelector('[name="remember"]');

            const email = sanitize(emailInput ? emailInput.value : '');
            const password = sanitize(passwordInput ? passwordInput.value : '');
            const remember = rememberInput ? rememberInput.checked : false;

            // Client-side validation
            if (!email || !password) {
                showFeedback('Please enter both email and password.', 'error');
                submitBtn.disabled = false;
                return;
            }
            // End Client-side validation

            try {
                // Firebase Modular: Set persistence
                const persistence = remember
                    ? browserLocalPersistence
                    : browserSessionPersistence;

                await setPersistence(auth, persistence);

                // Firebase Modular: Sign in user
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const firebaseUser = userCredential.user;

                // Sync Firebase auth with localStorage authService for route protection
                if (window.authService && firebaseUser) {
                    const userSession = {
                        id: firebaseUser.uid,
                        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                        email: firebaseUser.email || email,
                        signedInAt: new Date().toISOString()
                    };
                    window.authService.setActiveUser(userSession, remember);
                    console.log('✅ Firebase auth synced with authService');
                }

                // Login successful
                loginForm.reset();
                showFeedback('Login successful! Redirecting to your dashboard…', 'success');

                redirectWithDelay('index.html');

            } catch (error) {
                // Firebase Error Handling
                let message = 'An unknown error occurred during login.';
                console.error('Firebase Login Error:', error);

                switch (error.code) {
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        message = 'Invalid email or password.';
                        break;
                    case 'auth/invalid-email':
                        message = 'The email address is not valid.';
                        break;
                    case 'auth/user-disabled':
                        message = 'This account has been disabled.';
                        break;
                    default:
                        message = error.message;
                        break;
                }

                showFeedback(message, 'error');

            } finally {
                // Ensure button is re-enabled
                submitBtn.disabled = false;
            }
        });

        // Forgot password handler 
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', async (event) => {
                event.preventDefault();
                clearFeedback();

                const emailInput = loginForm.querySelector('[name="email"]');
                const email = sanitize(emailInput ? emailInput.value : '').toLowerCase();

                if (!email) {
                    showFeedback('Enter your email to reset your password.', 'error');
                    return;
                }

                try {
                    // Firebase Modular: Send password reset email
                    await sendPasswordResetEmail(auth, email);

                    showFeedback(
                        `Password reset email sent to **${email}**. Check your inbox!`,
                        'success'
                    );
                } catch (error) {
                    let message = 'Could not send reset email.';

                    if (error.code === 'auth/user-not-found') {
                        message = 'No account found for that email address.';
                    } else if (error.code === 'auth/invalid-email') {
                        message = 'The email address is not valid.';
                    } else {
                        message = error.message;
                    }

                    showFeedback(message, 'error');
                }
            });
        }
    }
})();