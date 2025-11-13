/**
 * Auth Check and UI Update Module
 * 
 * This module:
 * - Updates the UI to show the logged-in user's name
 * - Handles logout functionality
 * - Updates navigation based on auth state
 * 
 * Make sure auth-service.js is loaded before this script.
 */

(function () {
    'use strict';

    // Wait for authService to be available
    if (typeof window.authService === 'undefined') {
        console.error('auth-service.js must be loaded before auth-check.js');
        return;
    }

    /**
     * Update user display in header/navbar
     */
    const updateUserDisplay = () => {
        const user = window.authService.getCurrentUser();
        const userProfileElements = document.querySelectorAll('.user-profile span');
        
        if (user && userProfileElements.length > 0) {
            userProfileElements.forEach(el => {
                // Update if it's the default "John Doe" or empty
                if (el.textContent.trim() === 'John Doe' || !el.textContent.trim() || el.textContent.trim() === 'User') {
                    el.textContent = user.name || user.email || 'User';
                }
            });
        }
    };

    /**
     * Add logout functionality to user profile dropdown or button
     */
    const setupLogout = () => {
        // Look for existing logout button
        let logoutBtn = document.getElementById('logout-btn');
        
        if (!logoutBtn) {
            // Create logout button if it doesn't exist
            const userProfile = document.querySelector('.user-profile');
            if (userProfile) {
                // Check if there's a dropdown structure
                const chevron = userProfile.querySelector('.fa-chevron-down');
                if (chevron) {
                    // Create a dropdown menu
                    const dropdown = document.createElement('div');
                    dropdown.className = 'user-dropdown';
                    dropdown.id = 'user-dropdown';
                    
                    const logoutItem = document.createElement('button');
                    logoutItem.id = 'logout-btn';
                    logoutItem.className = 'logout-btn';
                    logoutItem.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                    
                    dropdown.appendChild(logoutItem);
                    userProfile.style.position = 'relative';
                    userProfile.appendChild(dropdown);
                    
                    // Toggle dropdown on click
                    userProfile.addEventListener('click', function(e) {
                        if (e.target.closest('.user-profile') && !e.target.closest('.user-dropdown')) {
                            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                        }
                    });
                    
                    // Close dropdown when clicking outside
                    document.addEventListener('click', function(e) {
                        if (!e.target.closest('.user-profile')) {
                            dropdown.style.display = 'none';
                        }
                    });
                    
                    logoutBtn = logoutItem;
                } else {
                    // Simple logout button (fallback if no chevron)
                    logoutBtn = document.createElement('button');
                    logoutBtn.id = 'logout-btn';
                    logoutBtn.className = 'logout-btn';
                    logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
                    logoutBtn.style.cssText = 'padding: 8px 16px; margin-left: 12px; border: 1px solid #e74c3c; background: transparent; color: #e74c3c; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.875rem; display: flex; align-items: center; gap: 8px;';
                    logoutBtn.addEventListener('mouseenter', function() {
                        this.style.background = '#e74c3c';
                        this.style.color = 'white';
                    });
                    logoutBtn.addEventListener('mouseleave', function() {
                        this.style.background = 'transparent';
                        this.style.color = '#e74c3c';
                    });
                    
                    const headerRight = document.querySelector('.header-right');
                    if (headerRight) {
                        headerRight.appendChild(logoutBtn);
                    }
                }
            }
        }

        // Add logout handler
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (confirm('Are you sure you want to logout?')) {
                    window.authService.logoutUser();
                    window.location.href = 'login.html';
                }
            });
        }
    };

    /**
     * Initialize auth UI updates
     */
    const init = () => {
        // Only run on dashboard pages (not login/register)
        const currentPage = window.location.pathname.split('/').pop() || window.location.pathname;
        if (currentPage.includes('login.html') || currentPage.includes('register.html')) {
            return;
        }

        // Update user display
        updateUserDisplay();
        
        // Setup logout
        setupLogout();
    };

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export for manual use
    window.updateUserDisplay = updateUserDisplay;
    window.setupLogout = setupLogout;
})();
