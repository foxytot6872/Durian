/**
 * Centralized Authentication Service
 * 
 * This service handles all authentication operations using localStorage.
 * It's designed to be easily replaceable with a real backend later.
 * 
 * To replace with real backend:
 * - Replace localStorage operations with API calls
 * - Keep the same function signatures
 * - Return the same data structures
 */

(function () {
    'use strict';

    // Storage keys
    const USERS_KEY = 'durianAuthUsers';
    const ACTIVE_USER_KEY = 'durianActiveUser';

    /**
     * Safe JSON parse with fallback
     */
    const safeParse = (value, fallback) => {
        try {
            return JSON.parse(value) ?? fallback;
        } catch {
            return fallback;
        }
    };

    /**
     * Load all registered users from localStorage
     */
    const loadUsers = () => safeParse(localStorage.getItem(USERS_KEY), []);

    /**
     * Save users array to localStorage
     */
    const saveUsers = (users) => {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    };

    /**
     * Auth Service Object
     * Exposes all authentication functions
     */
    const authService = {
        /**
         * Register a new user
         * @param {string} name - User's full name
         * @param {string} email - User's email address
         * @param {string} password - User's password (plain text for demo)
         * @returns {Object} { success: boolean, message: string, user?: Object }
         */
        registerUser: function (name, email, password) {
            // Validation
            if (!name || !email || !password) {
                return {
                    success: false,
                    message: 'All fields are required.'
                };
            }

            // Email validation (basic)
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return {
                    success: false,
                    message: 'Please enter a valid email address.'
                };
            }

            // Password length check
            if (password.length < 6) {
                return {
                    success: false,
                    message: 'Password must be at least 6 characters long.'
                };
            }

            // Check if email already exists
            const users = loadUsers();
            const emailExists = users.some((user) => user.email.toLowerCase() === email.toLowerCase());

            if (emailExists) {
                return {
                    success: false,
                    message: 'An account with this email already exists.'
                };
            }

            // Create new user
            const newUser = {
                id: Date.now().toString(), // Simple ID generation
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password: password, // In production, this should be hashed
                createdAt: new Date().toISOString()
            };

            // Save user
            users.push(newUser);
            saveUsers(users);

            return {
                success: true,
                message: 'Account created successfully!',
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    createdAt: newUser.createdAt
                }
            };
        },

        /**
         * Login a user
         * @param {string} email - User's email
         * @param {string} password - User's password
         * @param {boolean} remember - Whether to remember the user (persist in localStorage vs sessionStorage)
         * @returns {Object} { success: boolean, message: string, user?: Object }
         */
        loginUser: function (email, password, remember = false) {
            // Validation
            if (!email || !password) {
                return {
                    success: false,
                    message: 'Email and password are required.'
                };
            }

            // Find user
            const users = loadUsers();
            const user = users.find(
                (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
            );

            if (!user) {
                return {
                    success: false,
                    message: 'Invalid email or password.'
                };
            }

            // Create user session object (without password)
            const userSession = {
                id: user.id,
                name: user.name,
                email: user.email,
                signedInAt: new Date().toISOString()
            };

            // Save active user
            this.setActiveUser(userSession, remember);

            return {
                success: true,
                message: `Welcome back, ${user.name}!`,
                user: userSession
            };
        },

        /**
         * Logout the current user
         */
        logoutUser: function () {
            try {
                sessionStorage.removeItem(ACTIVE_USER_KEY);
                localStorage.removeItem(ACTIVE_USER_KEY);
                return { success: true, message: 'Logged out successfully.' };
            } catch (error) {
                return { success: false, message: 'Error logging out.' };
            }
        },

        /**
         * Get the currently logged-in user
         * @returns {Object|null} User object or null if not logged in
         */
        getCurrentUser: function () {
            try {
                // Check sessionStorage first, then localStorage
                const userData = sessionStorage.getItem(ACTIVE_USER_KEY) || localStorage.getItem(ACTIVE_USER_KEY);
                if (userData) {
                    return safeParse(userData, null);
                }
            } catch (error) {
                console.error('Error reading user data:', error);
            }
            return null;
        },

        /**
         * Check if user is authenticated
         * @returns {boolean}
         */
        isAuthenticated: function () {
            return this.getCurrentUser() !== null;
        },

        /**
         * Set the active user in storage
         * @param {Object} user - User object to store
         * @param {boolean} remember - If true, use localStorage; otherwise sessionStorage
         */
        setActiveUser: function (user, remember = false) {
            const payload = JSON.stringify(user);
            try {
                // Clear both storages first
                sessionStorage.removeItem(ACTIVE_USER_KEY);
                localStorage.removeItem(ACTIVE_USER_KEY);

                // Set in appropriate storage
                if (remember) {
                    localStorage.setItem(ACTIVE_USER_KEY, payload);
                } else {
                    sessionStorage.setItem(ACTIVE_USER_KEY, payload);
                }
            } catch (error) {
                console.error('Error saving user data:', error);
            }
        }
    };

    // Export to window for global access
    window.authService = authService;

    // Also export as module if needed
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = authService;
    }
})();

