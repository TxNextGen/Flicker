
class UserManager {
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
    
    if (authBox && signinBtn) {
        updateAuthState();
        

        signinBtn.addEventListener('click', function() {
            if (UserManager.isLoggedIn()) {

                toggleProfileMenu();
            } else {
              
                window.location.href = 'signin.html';
            }
        });
    }
});


function updateAuthState() {
    const authBox = document.getElementById('auth-box');
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
                        <span class="logout-icon">⚪</span>
                        Logout
                    </button>
                </div>
            </div>
        `;
        

        setupProfileEvents();
    } else {
  
        authBox.innerHTML = `<button id="signin-btn">Sign In</button>`;
        

        document.getElementById('signin-btn').addEventListener('click', function() {
            window.location.href = 'signin.html';
        });
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


function toggleProfileMenu() {
    const profileMenu = document.getElementById('profile-menu');
    if (profileMenu) {
        profileMenu.classList.toggle('hidden');
    }
}


function checkAuthOnLoad() {

    const currentPage = window.location.pathname.split('/').pop();
    if ((currentPage === 'signin.html' || currentPage === 'signup.html') && UserManager.isLoggedIn()) {
        window.location.href = 'index.html';
    }
}