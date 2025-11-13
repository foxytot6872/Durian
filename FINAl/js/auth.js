/**
 * Authentication UI Handler
 * 
 * This file handles the UI interactions for login and register pages.
 * It uses the authService for all authentication operations.
 * 
 * Make sure auth-service.js is loaded before this script.
 */

'use strict';

(function () {
    // Wait for authService to be available
    if (typeof window.authService === 'undefined') {
        console.error('auth-service.js must be loaded before auth.js');
        return;
    }

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

    // ========== REGISTER PAGE HANDLER ==========
    if (authPage === 'register') {
        const registerForm = document.getElementById('register-form');
        if (!registerForm) {
            return;
        }

        registerForm.addEventListener('submit', (event) => {
            event.preventDefault();
            clearFeedback();

            const submitBtn = registerForm.querySelector('.auth-submit');
            submitBtn.disabled = true;

            // Get form values
            const nameInput = registerForm.querySelector('[name="name"]');
            const emailInput = registerForm.querySelector('[name="email"]');
            const passwordInput = registerForm.querySelector('[name="password"]');
            const confirmPasswordInput = registerForm.querySelector('[name="confirmPassword"]');
            const termsInput = registerForm.querySelector('[name="terms"]');

            const name = sanitize(nameInput ? nameInput.value : '');
            const email = sanitize(emailInput ? emailInput.value : '');
            const password = sanitize(passwordInput ? passwordInput.value : '');
            const confirmPassword = sanitize(confirmPasswordInput ? confirmPasswordInput.value : '');
            const termsAccepted = termsInput ? termsInput.checked : false;

            // Client-side validation
            if (!name || !email || !password || !confirmPassword) {
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

            if (password !== confirmPassword) {
                showFeedback('Passwords do not match. Try again.', 'error');
                submitBtn.disabled = false;
                return;
            }

            // Use authService to register
            const result = window.authService.registerUser(name, email, password);

            if (!result.success) {
                showFeedback(result.message, 'error');
                submitBtn.disabled = false;
                return;
            }

            // Registration successful
            registerForm.reset();
            showFeedback('Account created successfully! Redirecting to sign in…', 'success');
            
            // Optionally auto-login and redirect to dashboard
            // For now, redirect to login page
            redirectWithDelay('login.html');

            submitBtn.disabled = false;
        });
    }

    // ========== LOGIN PAGE HANDLER ==========
    if (authPage === 'login') {
        const loginForm = document.getElementById('login-form');
        if (!loginForm) {
            console.error('Login form not found!');
            return;
        }

        const forgotPasswordLink = document.querySelector('.auth-link');

        loginForm.addEventListener('submit', (event) => {
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

            // Use authService to login
            const result = window.authService.loginUser(email, password, remember);

            if (!result.success) {
                showFeedback(result.message, 'error');
                submitBtn.disabled = false;
                return;
            }

            // Login successful
            loginForm.reset();
            showFeedback(result.message + ' Redirecting to your dashboard…', 'success');
            
            // Redirect to dashboard
            redirectWithDelay('index.html');

            submitBtn.disabled = false;
        });

        // Forgot password handler
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (event) => {
                event.preventDefault();
                clearFeedback();

                const emailInput = loginForm.querySelector('[name="email"]');
                const email = sanitize(emailInput ? emailInput.value : '').toLowerCase();
                
                if (!email) {
                    showFeedback('Enter your email to look up your account.', 'error');
                    return;
                }

                // Check if account exists (using authService's internal method)
                // For demo purposes, we'll just show a message
                showFeedback(
                    'Password reset functionality will be implemented soon. For now, please contact the administrator.',
                    'success'
                );
            });
        }
    }
})();
