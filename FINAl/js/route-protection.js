/**
 * Route Protection Module
 * 
 * This module protects dashboard pages by checking authentication status.
 * If user is not authenticated, they are redirected to login page.
 * 
 * Add this script to all protected pages (dashboard, finance, map, etc.)
 * Make sure auth-service.js is loaded before this script.
 */

(function () {
    'use strict';

    // Wait for authService to be available
    if (typeof window.authService === 'undefined') {
        console.error('auth-service.js must be loaded before route-protection.js');
        // Still redirect to login if service isn't available
        if (!window.location.pathname.includes('login.html') && 
            !window.location.pathname.includes('register.html')) {
            window.location.href = 'login.html';
        }
        return;
    }

    /**
     * List of public pages that don't require authentication
     */
    const publicPages = [
        'login.html',
        'register.html',
        '404.html'
    ];

    /**
     * Check if current page is public
     */
    const isPublicPage = () => {
        const currentPage = window.location.pathname.split('/').pop() || window.location.pathname;
        return publicPages.some(page => currentPage.includes(page));
    };

    /**
     * Protect the current route
     */
    const protectRoute = () => {
        // Skip protection for public pages
        if (isPublicPage()) {
            // If user is already logged in and tries to access login/register, redirect to dashboard
            if (window.authService.isAuthenticated()) {
                const currentPage = window.location.pathname.split('/').pop() || window.location.pathname;
                if (currentPage.includes('login.html') || currentPage.includes('register.html')) {
                    window.location.href = 'index.html';
                }
            }
            return;
        }

        // Check authentication for protected pages
        if (!window.authService.isAuthenticated()) {
            // Store the attempted URL to redirect back after login
            const currentUrl = window.location.href;
            sessionStorage.setItem('redirectAfterLogin', currentUrl);
            
            // Redirect to login
            window.location.href = 'login.html';
        }
    };

    // Run protection when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', protectRoute);
    } else {
        protectRoute();
    }

    // Export function for manual use if needed
    window.protectRoute = protectRoute;
})();

