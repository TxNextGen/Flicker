class UserManager {
    static tempEmailDomains = [
        '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
        'tempmail.org', 'yopmail.com', 'throwawaymail.com',
        'maildrop.cc', 'getnada.com', 'temp-mail.org',
        'disposablemail.com', 'sharklasers.com', 'trashmail.com',
        'fakeinbox.com', 'emailondeck.com', 'tempinbox.com'
    ];

    static isTempMail(email) {
        const domain = email.toLowerCase().split('@')[1];
        return this.tempEmailDomains.includes(domain);
    }
    static isTemporaryEmail(email) {
        return this.isTempMail(email);
    }

    static getUsers() {
        return JSON.parse(localStorage.getItem('flickerUsers') || '[]');
    }

    static saveUsers(users) {
        localStorage.setItem('flickerUsers', JSON.stringify(users));
    }

    static getCurrentUser() {
        return JSON.parse(localStorage.getItem('flickerCurrentUser') || 'null');
    }

    static setCurrentUser(user) {
        localStorage.setItem('flickerCurrentUser', JSON.stringify(user));
    }

    static signUp(name, email, password) {
        if (this.isTempMail(email)) {
            throw new Error('Temporary email addresses are not allowed. Please use a permanent email address.');
        }

        const users = this.getUsers();
        
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            throw new Error('User already exists with this email');
        }

        const newUser = {
            id: Date.now().toString(),
            name,
            email,
            password: btoa(password), 
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        this.saveUsers(users);
        this.setCurrentUser(newUser); 
        
        return newUser;
    }

    static signIn(email, password) {
        const users = this.getUsers();
        const user = users.find(user => 
            user.email === email && user.password === btoa(password)
        );
        
        if (!user) {
            throw new Error('Invalid email or password');
        }

        this.setCurrentUser(user);
        return user;
    }

    static signInWithGoogle(googleUser) {
        if (this.isTempMail(googleUser.email)) {
            throw new Error('Temporary email addresses are not allowed. Please use a permanent email address.');
        }

        const users = this.getUsers();
        let existingUser = users.find(user => user.email === googleUser.email);
        
        if (existingUser) {
            existingUser.name = googleUser.name;
            existingUser.picture = googleUser.picture;
            existingUser.provider = 'google';
            this.saveUsers(users);
            this.setCurrentUser(existingUser);
            return existingUser;
        } else {
            const newUser = {
                id: 'google_' + googleUser.sub,
                name: googleUser.name,
                email: googleUser.email,
                picture: googleUser.picture,
                provider: 'google',
                createdAt: new Date().toISOString()
            };
            
            users.push(newUser);
            this.saveUsers(users);
            this.setCurrentUser(newUser);
            return newUser;
        }
    }

    static logout() {
        localStorage.removeItem('flickerCurrentUser');
    }

    static isLoggedIn() {
        return this.getCurrentUser() !== null;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const authBox = document.getElementById('auth-box');
    const signinBtn = document.getElementById('signin-btn');
    
    if (authBox) {
        updateAuthState();
        checkAuthOnLoad();
    }
});

function updateAuthState() {
    const authBox = document.getElementById('auth-box');
    if (!authBox) return;
    
    const currentUser = UserManager.getCurrentUser();
    
    if (currentUser) {
        authBox.innerHTML = `
            <div class="profile-dropdown">
                <button id="profile-btn" class="profile-btn">
                    <div class="profile-avatar">${currentUser.name.charAt(0).toUpperCase()}</div>
                    <span class="profile-name">${currentUser.name}</span>
                    <span class="dropdown-arrow">▼</span>
                </button>
                <div id="profile-menu" class="profile-menu hidden">
                    <div class="profile-info">
                        <div class="profile-avatar-large">${currentUser.name.charAt(0).toUpperCase()}</div>
                        <div class="profile-details">
                            <div class="profile-name-large">${currentUser.name}</div>
                            <div class="profile-email">${currentUser.email}</div>
                        </div>
                    </div>
                    <hr class="profile-divider">
                    <button id="logout-btn" class="logout-btn">
                        <span class="logout-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                         xmlns="http://www.w3.org/2000/svg">
                        <path d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.59L17 17L22 12L17
                           7ZM4 5H12V3H4C2.9 3 2 3.9
                           2 5V19C2 20.1 2.9 21 4
                           21H12V19H4V5Z" fill="currentColor"/>
                          </svg>
                       </span>
                     Logout
                    </button>
                </div>
            </div>
        `;
        
        setupProfileEvents();
    } else {
        authBox.innerHTML = `<button id="signin-btn">Sign In</button>`;
        
        const newSigninBtn = document.getElementById('signin-btn');
        if (newSigninBtn) {
            newSigninBtn.addEventListener('click', function() {
                window.location.href = 'Auth/signin.html';
            });
        }
    }
}

function setupProfileEvents() {
    const profileBtn = document.getElementById('profile-btn');
    const profileMenu = document.getElementById('profile-menu');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            profileMenu.classList.toggle('hidden');
        });
        
        document.addEventListener('click', function(e) {
            if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
                profileMenu.classList.add('hidden');
            }
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            UserManager.logout();
            updateAuthState();
            window.location.reload();
        });
    }
}

function checkAuthOnLoad() {
    const currentPage = window.location.pathname.split('/').pop();
    if ((currentPage === 'signin.html' || currentPage === 'signup.html') && UserManager.isLoggedIn()) {
        window.location.href = '../index.html';
    }
}

function handleCredentialResponse(response) {
    try {
        const credential = response.credential;
        const payload = JSON.parse(atob(credential.split('.')[1]));
        
        const googleUser = {
            sub: payload.sub,
            name: payload.name,
            email: payload.email,
            picture: payload.picture
        };
        
        UserManager.signInWithGoogle(googleUser);
        
        if (window.location.pathname.includes('Auth/')) {
            window.location.href = '../index.html';
        } else {
            window.location.reload();
        }
    } catch (error) {
        console.error('Google sign-in error:', error);
        showError('Failed to sign in with Google. Please try again.');
    }
}

window.onload = function() {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: "YOUR_GOOGLE_CLIENT_ID",
            callback: handleCredentialResponse
        });
    }
};