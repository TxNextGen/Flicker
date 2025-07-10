const CONFIG = {
    API_BASE_URL: 'https://flickerserver1-cs8h.onrender.com/api',
    GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID',
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, 
    AUTH_TOKEN_KEY: 'auth_token'
};

const Utils = {
    validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        if (password.length < minLength) {
            return { valid: false, message: 'Password must be at least 8 characters long' };
        }
        if (!hasUpperCase) {
            return { valid: false, message: 'Password must contain at least one uppercase letter' };
        }
        if (!hasLowerCase) {
            return { valid: false, message: 'Password must contain at least one lowercase letter' };
        }
        if (!hasNumbers) {
            return { valid: false, message: 'Password must contain at least one number' };
        }
        if (!hasSpecialChar) {
            return { valid: false, message: 'Password must contain at least one special character' };
        }
        
        return { valid: true, message: 'Password is strong' };
    },

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    isTempEmail(email) {
        const tempDomains = [
            '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
            'tempmail.org', 'yopmail.com', 'throwawaymail.com',
            'maildrop.cc', 'getnada.com', 'temp-mail.org',
            'disposablemail.com', 'sharklasers.com', 'trashmail.com',
            'fakeinbox.com', 'emailondeck.com', 'tempinbox.com'
        ];
        const domain = email.toLowerCase().split('@')[1];
        return tempDomains.includes(domain);
    },

    getAuthToken() {
        return localStorage.getItem(CONFIG.AUTH_TOKEN_KEY);
    },

    setAuthToken(token) {
        localStorage.setItem(CONFIG.AUTH_TOKEN_KEY, token);
    },

    removeAuthToken() {
        localStorage.removeItem(CONFIG.AUTH_TOKEN_KEY);
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    showLoading(element, text = 'Loading...') {
        element.disabled = true;
        element.dataset.originalText = element.textContent;
        element.innerHTML = `
            <span class="loading-spinner"></span>
            ${text}
        `;
    },

    hideLoading(element) {
        element.disabled = false;
        element.textContent = element.dataset.originalText || 'Submit';
    }
};

class APIService {
    static async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const token = Utils.getAuthToken();
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            },
      
            mode: 'cors'
        };

        const config = { ...defaultOptions, ...options };
        
        try {
            console.log('Making request to:', url); 
            const response = await fetch(url, config);
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = { message: await response.text() };
            }
            
            if (!response.ok) {
                if (response.status === 401) {
                    Utils.removeAuthToken();
                    UserManager.currentUser = null;
                    UserManager.notifyAuthListeners(null);
                }
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error - please check your connection and try again');
            }
            throw error;
        }
    }

    static async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    static async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

class UserManager {
    static currentUser = null;
    static authListeners = new Set();

    static addAuthListener(callback) {
        this.authListeners.add(callback);
    }

    static removeAuthListener(callback) {
        this.authListeners.delete(callback);
    }

    static notifyAuthListeners(user) {
        this.authListeners.forEach(callback => callback(user));
    }

    static async getCurrentUser() {
        if (this.currentUser) return this.currentUser;
        
        const token = Utils.getAuthToken();
        if (!token) return null;
        
        try {
            const response = await APIService.get('/auth/me');
            this.currentUser = response.user;
            return this.currentUser;
        } catch (error) {
            console.error('Failed to get current user:', error);
            Utils.removeAuthToken();
            return null;
        }
    }

    static setCurrentUser(user) {
        this.currentUser = user;
        this.notifyAuthListeners(user);
    }

    static async signUp(name, email, password) {
        if (!name.trim()) {
            throw new Error('Name is required');
        }
        
        if (!Utils.validateEmail(email)) {
            throw new Error('Please enter a valid email address');
        }
        
        if (Utils.isTempEmail(email)) {
            throw new Error('Temporary email addresses are not allowed. Please use a permanent email address.');
        }
        
        const passwordValidation = Utils.validatePassword(password);
        if (!passwordValidation.valid) {
            throw new Error(passwordValidation.message);
        }

        try {
            const response = await APIService.post('/auth/signup', {
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password
            });
        
            Utils.setAuthToken(response.token);
            this.setCurrentUser(response.user);
            return response.user;
        } catch (error) {
            console.error('Sign up error:', error);
            throw error;
        }
    }

    static async signIn(email, password) {
        if (!Utils.validateEmail(email)) {
            throw new Error('Please enter a valid email address');
        }
        
        if (!password) {
            throw new Error('Password is required');
        }

        try {
            const response = await APIService.post('/auth/signin', {
                email: email.toLowerCase().trim(),
                password
            });
            
            Utils.setAuthToken(response.token);
            this.setCurrentUser(response.user);
            return response.user;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    static async signInWithGoogle(googleCredential) {
        try {
            const response = await APIService.post('/auth/google', {
                credential: googleCredential
            });
        
            Utils.setAuthToken(response.token);
            this.setCurrentUser(response.user);
            return response.user;
        } catch (error) {
            console.error('Google sign in error:', error);
            throw error;
        }
    }

    static async requestPasswordReset(email) {
        if (!Utils.validateEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        try {
            await APIService.post('/auth/forgot-password', {
                email: email.toLowerCase().trim()
            });
            return { success: true, message: 'Password reset email sent' };
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    }

    static async resetPassword(token, newPassword) {
        const passwordValidation = Utils.validatePassword(newPassword);
        if (!passwordValidation.valid) {
            throw new Error(passwordValidation.message);
        }

        try {
            await APIService.post('/auth/reset-password', {
                token,
                password: newPassword
            });
            return { success: true, message: 'Password reset successful' };
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    }

    static async logout() {
        try {
            const token = Utils.getAuthToken();
            if (token) {
                await APIService.post('/auth/logout');
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.currentUser = null;
            this.notifyAuthListeners(null);
            Utils.removeAuthToken();
        }
    }

    static async isLoggedIn() {
        const user = await this.getCurrentUser();
        return user !== null;
    }

    static async updateProfile(updateData) {
        try {
            const response = await APIService.put('/auth/profile', updateData);
            this.setCurrentUser(response.user);
            return response.user;
        } catch (error) {
            console.error('Profile update error:', error);
            throw error;
        }
    }

    static async deleteAccount() {
        try {
            await APIService.delete('/auth/account');
            this.currentUser = null;
            this.notifyAuthListeners(null);
            Utils.removeAuthToken();
            return { success: true, message: 'Account deleted successfully' };
        } catch (error) {
            console.error('Account deletion error:', error);
            throw error;
        }
    }
}

function togglePassword(inputId, iconId) {
    const passwordInput = document.getElementById(inputId);
    const toggleIcon = document.getElementById(iconId);
    
    if (!passwordInput || !toggleIcon) return;
    
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    
    toggleIcon.innerHTML = isPassword ? 
        `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M1 1l22 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>` :
        `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
}

function showMessage(message, type = 'error') {
    const messageContainer = document.getElementById('message-container') || createMessageContainer();
    messageContainer.className = `message-container ${type}`;
    messageContainer.textContent = message;
    messageContainer.style.display = 'block';
    
    setTimeout(() => {
        messageContainer.style.display = 'none';
    }, 5000);
}

function createMessageContainer() {
    const container = document.createElement('div');
    container.id = 'message-container';
    container.className = 'message-container';
    document.body.appendChild(container);
    return container;
}

function showError(message) {
    showMessage(message, 'error');
}

function showSuccess(message) {
    showMessage(message, 'success');
}

async function updateAuthState() {
    const authBox = document.getElementById('auth-box');
    if (!authBox) return;
    
    try {
        const currentUser = await UserManager.getCurrentUser();
        
        if (currentUser) {
            const firstName = currentUser.name.split(' ')[0];
            const avatarUrl = currentUser.picture || null;
            
            authBox.innerHTML = `
                <div class="profile-dropdown">
                    <button id="profile-btn" class="profile-btn">
                        <div class="profile-avatar">
                            ${avatarUrl ? 
                                `<img src="${avatarUrl}" alt="Profile" class="avatar-img">` : 
                                firstName.charAt(0).toUpperCase()
                            }
                        </div>
                        <span class="profile-name">${firstName}</span>
                        <span class="dropdown-arrow">▼</span>
                    </button>
                    <div id="profile-menu" class="profile-menu hidden">
                        <div class="profile-info">
                            <div class="profile-avatar-large">
                                ${avatarUrl ? 
                                    `<img src="${avatarUrl}" alt="Profile" class="avatar-img">` : 
                                    firstName.charAt(0).toUpperCase()
                                }
                            </div>
                            <div class="profile-details">
                                <div class="profile-name-large">${currentUser.name}</div>
                                <div class="profile-email">${currentUser.email}</div>
                            </div>
                        </div>
                        <hr class="profile-divider">
                        <button id="settings-btn" class="menu-item">
                            <span class="menu-icon">⚙️</span>
                            Settings
                        </button>
                        <button id="logout-btn" class="menu-item logout-btn">
                            <span class="menu-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.59L17 17L22 12L17 7ZM4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z" fill="currentColor"/>
                                </svg>
                            </span>
                            Logout
                        </button>
                    </div>
                </div>
            `;
            
            setupProfileEvents();
        } else {
            authBox.innerHTML = `<button id="signin-btn" class="auth-btn">Sign In</button>`;
            
            const signinBtn = document.getElementById('signin-btn');
            if (signinBtn) {
                signinBtn.addEventListener('click', () => {
                    window.location.href = 'Auth/signin.html';
                });
            }
        }
    } catch (error) {
        console.error('Failed to update auth state:', error);
        authBox.innerHTML = `<button id="signin-btn" class="auth-btn">Sign In</button>`;
    }
}

function setupProfileEvents() {
    const profileBtn = document.getElementById('profile-btn');
    const profileMenu = document.getElementById('profile-menu');
    const logoutBtn = document.getElementById('logout-btn');
    const settingsBtn = document.getElementById('settings-btn');
    
    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle('hidden');
        });
        
        document.addEventListener('click', (e) => {
            if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
                profileMenu.classList.add('hidden');
            }
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                Utils.showLoading(logoutBtn, 'Logging out...');
                await UserManager.logout();
                window.location.reload();
            } catch (error) {
                Utils.hideLoading(logoutBtn);
                showError('Failed to logout. Please try again.');
            }
        });
    }
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = 'Auth/settings.html';
        });
    }
}

function handleCredentialResponse(response) {
    const signInButton = document.getElementById('google-signin-btn');
    
    if (signInButton) {
        Utils.showLoading(signInButton, 'Signing in...');
    }
    
    UserManager.signInWithGoogle(response.credential)
        .then(() => {
            showSuccess('Successfully signed in with Google!');
            setTimeout(() => {
                if (window.location.pathname.includes('Auth/')) {
                    window.location.href = '../index.html';
                } else {
                    window.location.reload();
                }
            }, 1000);
        })
        .catch(error => {
            console.error('Google sign-in error:', error);
            showError(error.message || 'Failed to sign in with Google. Please try again.');
            
            if (signInButton) {
                Utils.hideLoading(signInButton);
            }
        });
}

document.addEventListener('DOMContentLoaded', async function() {
    await updateAuthState();

    const currentPage = window.location.pathname.split('/').pop();
    const authPages = ['signin.html', 'signup.html'];
    
    if (authPages.includes(currentPage)) {
        const isLoggedIn = await UserManager.isLoggedIn();
        if (isLoggedIn) {
            window.location.href = '../index.html';
        }
    }
    
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: CONFIG.GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: false
        });
    }
});

UserManager.addAuthListener((user) => {
    if (typeof window.refreshQuotes === 'function') {
        window.refreshQuotes();
    }
});

window.UserManager = UserManager;
window.Utils = Utils;
window.showError = showError;
window.showSuccess = showSuccess;
window.togglePassword = togglePassword;