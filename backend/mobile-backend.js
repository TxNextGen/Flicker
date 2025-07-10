class MobileCookieManager {
    constructor() {
        this.cookiesAccepted = this.getCookieConsent();
        this.init();
    }

    init() {
        if (this.cookiesAccepted === null) {
            this.showCookieConsent();
        } else if (!this.cookiesAccepted) {
            document.body.classList.add('cookies-declined');
            this.disableMobileFeatures();
        } else {
            this.loadAnalytics();
        }
        this.bindEvents();
    }

    bindEvents() {
        const mobileInput = document.getElementById('mobile-input');
        const mobileSend = document.getElementById('mobile-send');
        const mobileSignin = document.getElementById('mobile-signin');
        const mobileAddChat = document.querySelector('.mobile-add-chat');
        const mobileImageUpload = document.getElementById('mobile-image-upload-btn');

        if (!this.cookiesAccepted) {
            [mobileInput, mobileSend, mobileSignin, mobileAddChat, mobileImageUpload].forEach(element => {
                if (element) {
                    element.addEventListener('click', (e) => {
                        if (!this.cookiesAccepted) {
                            e.preventDefault();
                            e.stopPropagation();
                            this.showMobileCookieNotice();
                            return false;
                        }
                    });
                }
            });
        }
    }

    showCookieConsent() {
        this.createMobileCookiePopup();
    }

    createMobileCookiePopup() {
        if (document.getElementById('mobile-cookie-consent')) return;

        const popupHTML = `
            <div id="mobile-cookie-consent" class="mobile-cookie-popup">
                <div class="mobile-cookie-content">
                    <h3>🍪 Cookie Settings</h3>
                    <p>We use cookies to enhance your experience and provide personalized features.</p>
                    <div class="mobile-cookie-buttons">
                        <button id="mobile-accept-cookies" class="mobile-cookie-btn accept">Accept All</button>
                        <button id="mobile-decline-cookies" class="mobile-cookie-btn decline">Decline</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', popupHTML);

        const style = document.createElement('style');
        style.textContent = `
            .mobile-cookie-popup {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: rgba(20, 20, 20, 0.95);
                backdrop-filter: blur(10px);
                border-top: 1px solid rgba(255, 255, 255, 0.2);
                padding: 20px;
                z-index: 10000;
                transform: translateY(100%);
                transition: transform 0.3s ease;
                font-family: 'Raleway', sans-serif;
            }

            .mobile-cookie-popup.show {
                transform: translateY(0);
            }

            .mobile-cookie-content h3 {
                color: white;
                margin-bottom: 10px;
                font-size: 1.1rem;
                font-family: 'Raleway', sans-serif;
            }

            .mobile-cookie-content p {
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 20px;
                font-size: 0.9rem;
                line-height: 1.4;
                font-family: 'Raleway', sans-serif;
            }

            .mobile-cookie-buttons {
                display: flex;
                gap: 10px;
            }

            .mobile-cookie-btn {
                flex: 1;
                padding: 12px;
                border: none;
                border-radius: 8px;
                font-family: inherit;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: 'Raleway', sans-serif;
            }

            .mobile-cookie-btn.accept {
                background: rgba(255, 255, 255, 0.1);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
                font-family: 'Raleway', sans-serif;
            }

            .mobile-cookie-btn.decline {
                background: rgba(255, 255, 255, 0.1);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
                font-family: 'Raleway', sans-serif;
            }

            .mobile-cookie-btn:hover {
                transform: translateY(-1px);
            }
        `;
        document.head.appendChild(style);

        setTimeout(() => {
            document.getElementById('mobile-cookie-consent').classList.add('show');
        }, 100);

        document.getElementById('mobile-accept-cookies').addEventListener('click', () => this.acceptCookies());
        document.getElementById('mobile-decline-cookies').addEventListener('click', () => this.declineCookies());
    }

    showMobileCookieNotice() {
        this.showMobileToast('Please accept cookies to use chat features', 'warning');
    }

    acceptCookies() {
        this.cookiesAccepted = true;
        document.cookie = 'cookieConsent=accepted; path=/; max-age=31536000; SameSite=Strict';

        this.hideMobileCookieConsent();
        document.body.classList.remove('cookies-declined');
        this.enableMobileFeatures();
        this.loadAnalytics();
        this.showMobileToast('Cookies accepted! Chat enabled.', 'success');
    }

    declineCookies() {
        this.cookiesAccepted = false;
        this.hideMobileCookieConsent();
        document.body.classList.add('cookies-declined');
        this.disableMobileFeatures();
        this.showMobileToast('Cookies declined. Chat disabled.', 'info');
    }

    hideMobileCookieConsent() {
        const popup = document.getElementById('mobile-cookie-consent');
        if (popup) {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 300);
        }
    }

    enableMobileFeatures() {
        const mobileInput = document.getElementById('mobile-input');
        const mobileSend = document.getElementById('mobile-send');
        const mobileImageUpload = document.getElementById('mobile-image-upload-btn');

        if (mobileInput) {
            mobileInput.disabled = false;
            mobileInput.placeholder = 'Send a message';
        }
        if (mobileSend) {
            mobileSend.disabled = false;
            mobileSend.style.opacity = '1';
        }
        if (mobileImageUpload) {
            mobileImageUpload.disabled = false;
            mobileImageUpload.style.opacity = '1';
        }
    }

    disableMobileFeatures() {
        const mobileInput = document.getElementById('mobile-input');
        const mobileSend = document.getElementById('mobile-send');
        const mobileImageUpload = document.getElementById('mobile-image-upload-btn');

        if (mobileInput) {
            mobileInput.disabled = true;
            mobileInput.placeholder = 'Accept cookies to enable chat';
        }
        if (mobileSend) {
            mobileSend.disabled = true;
            mobileSend.style.opacity = '0.5';
        }
        if (mobileImageUpload) {
            mobileImageUpload.disabled = true;
            mobileImageUpload.style.opacity = '0.5';
        }
    }

    showMobileToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `mobile-toast ${type}`;
        toast.textContent = message;

        const style = document.createElement('style');
        style.textContent = `
            .mobile-toast {
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : type === 'removed' ? '#555555' : '#2196F3'};
                color: white;
                padding: 12px 20px;
                border-radius: 25px;
                z-index: 10001;
                font-size: 0.9rem;
                font-weight: 500;
                animation: slideDown 0.3s ease;
            }

            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
            style.remove();
        }, 3000);
    }

    getCookieConsent() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'cookieConsent') {
                return value === 'accepted';
            }
        }
        return null;
    }

    loadAnalytics() {
        const script = document.getElementById('gtag-script');
        if (script && script.type === 'text/plain') {
            const newScript = document.createElement('script');
            newScript.innerHTML = script.innerHTML;
            document.head.appendChild(newScript);
            script.type = 'text/javascript';
        }
    }

    canUseCookies() {
        return this.cookiesAccepted === true;
    }

    setItem(key, value) {
        if (!this.canUseCookies()) {
            console.warn('Cannot save to localStorage - cookies declined');
            return false;
        }
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    getItem(key) {
        if (!this.canUseCookies()) return null;
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }

    removeItem(key) {
        if (!this.canUseCookies()) return false;
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }
}

class MobileChatManager {
    constructor() {
        this.currentChatId = null;
        this.allChats = {};
        this.selectedImage = null;
        this.selectedImageName = '';
        this.currentRenamingChatId = null;
        this.CHATS_STORAGE_KEY = "flicker_mobile_chats";
        this.CURRENT_CHAT_KEY = "flicker_mobile_current_chat";

        this.initializeElements();
        this.bindEvents();
        this.createPopups();
        this.loadChats();
    }

    initializeElements() {
        this.mobileInput = document.getElementById('mobile-input');
        this.mobileSend = document.getElementById('mobile-send');
        this.mobileChat = document.getElementById('mobile-chat');
        this.mobileChatContainer = document.getElementById('mobile-chat-container');
        this.mobileWelcome = document.getElementById('mobile-welcome');
        this.mobileChatList = document.getElementById('mobile-chat-list');
        this.mobileAddChat = document.querySelector('.mobile-add-chat');
        this.mobileSidebar = document.getElementById('mobile-sidebar');
        this.mobileOverlay = document.getElementById('mobile-overlay');
        this.mobileImageUploadBtn = document.getElementById('mobile-image-upload-btn');
        this.mobileImageInput = document.getElementById('mobile-image-input');
        this.mobileImagePreview = document.getElementById('mobile-image-preview');
        this.mobileRemoveImageBtn = document.getElementById('mobile-remove-image-btn');
    }

    bindEvents() {
        if (this.mobileInput) {
            this.mobileInput.addEventListener('keydown', (e) => this.handleKeydown(e));
            this.mobileInput.addEventListener('focus', (e) => this.handleInputFocus(e));
        }

        if (this.mobileSend) {
            this.mobileSend.addEventListener('click', (e) => this.sendMessage(e));
        }

        if (this.mobileAddChat) {
            this.mobileAddChat.addEventListener('click', (e) => this.createNewChat(e));
        }


        if (this.mobileImageUploadBtn) {
            this.mobileImageUploadBtn.addEventListener('click', (e) => this.handleImageUpload(e));
        }

        if (this.mobileImageInput) {
            this.mobileImageInput.addEventListener('change', (e) => this.handleImageSelect(e));
        }

        const mobileSignin = document.getElementById('mobile-signin');
        if (mobileSignin) {
            mobileSignin.addEventListener('click', (e) => this.handleSignin(e));
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.mobile-chat-menu-btn') && !e.target.closest('.mobile-chat-menu')) {
                this.closeAllMenus();
            }
        });
    }

    createPopups() {
        this.createRenamePopup();
        this.createImagePreviewStyles();
    }

    createRenamePopup() {
        if (document.getElementById('mobile-rename-popup')) return;

        const popupHTML = `
            <div id="mobile-rename-popup" class="mobile-popup-overlay">
                <div class="mobile-popup-content">
                    <h3>Rename Chat</h3>
                    <input type="text" id="mobile-rename-input" placeholder="Enter new chat name">
                    <div class="mobile-popup-buttons">
                        <button id="mobile-cancel-rename" class="mobile-popup-btn cancel-btn">Cancel</button>
                        <button id="mobile-save-rename" class="mobile-popup-btn save-btn">Save</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', popupHTML);

        const style = document.createElement('style');
        style.textContent = `
            .mobile-popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10002;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                padding: 20px;
            }

            .mobile-popup-overlay.show {
                opacity: 1;
                visibility: visible;
            }

            .mobile-popup-content {
                background: #1e1e1e;
                border-radius: 12px;
                padding: 24px;
                width: 100%;
                max-width: 400px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }

            .mobile-popup-overlay.show .mobile-popup-content {
                transform: scale(1);
            }

            .mobile-popup-content h3 {
                color: white;
                margin-bottom: 16px;
                font-size: 1.2rem;
                text-align: center;
            }

            #mobile-rename-input {
                width: 100%;
                padding: 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.05);
                color: white;
                font-family: inherit;
                margin-bottom: 20px;
                box-sizing: border-box;
            }

            #mobile-rename-input:focus {
                outline: none;
                background-color: rgba(255, 255, 255, 0.2);
            }

            .mobile-popup-buttons {
                display: flex;
                gap: 12px;
            }

            .mobile-popup-btn {
                flex: 1;
                padding: 12px;
                border: none;
                border-radius: 8px;
                font-family: inherit;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .mobile-popup-btn.cancel-btn {
                background: rgba(255, 255, 255, 0.1);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .mobile-popup-btn.save-btn {
                background: rgba(255, 255, 255, 0.1);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .mobile-popup-btn:hover {
                transform: translateY(-1px);
            }
        `;
        document.head.appendChild(style);

        document.getElementById('mobile-save-rename')?.addEventListener('click', () => this.saveRename());
        document.getElementById('mobile-cancel-rename')?.addEventListener('click', () => this.cancelRename());
        
        const input = document.getElementById('mobile-rename-input');
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.saveRename();
            else if (e.key === 'Escape') this.cancelRename();
        });

        document.getElementById('mobile-rename-popup')?.addEventListener('click', (e) => {
            if (e.target.id === 'mobile-rename-popup') this.cancelRename();
        });
    }

    createImagePreviewStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .mobile-image-preview {
                position: fixed;
                bottom: 80px;
                left: 16px;
                right: 16px;
                 background: rgba(40, 36, 61, 0.95);
                backdrop-filter: blur(15px);
                border-radius: 16px;
                padding: 16px;
                display: none;
                align-items: center;
                gap: 12px;
                border: 1px solid rgba(255, 255, 255, 0.15);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                z-index: 1000;
                max-width: 500px;
                margin: 0 auto;
            }

            .mobile-image-preview.show {
                display: flex;
                animation: slideUpPreview 0.3s ease-out;
            }

            @keyframes slideUpPreview {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .mobile-image-preview img {
                width: 60px;
                height: 60px;
                object-fit: cover;
                border-radius: 12px;
                border: 2px solid rgba(255, 255, 255, 0.2);
                flex-shrink: 0;
            }

            .mobile-image-preview-info {
                flex: 1;
                color: white;
                min-width: 0;
            }

            .mobile-image-preview-name {
                font-size: 0.95rem;
                font-weight: 500;
                margin-bottom: 4px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                color: #ffffff;
            }

            .mobile-image-preview-size {
                font-size: 0.8rem;
                color: rgba(255, 255, 255, 0.7);
            }

            .mobile-remove-image-btn {
                background: rgba(255, 59, 59, 0.15);
                border: 1px solid rgba(255, 59, 59, 0.4);
                color: #ff6b6b;
                padding: 10px;
                border-radius: 12px;
                font-size: 0.85rem;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 44px;
                height: 44px;
                flex-shrink: 0;
                font-weight: 600;
            }

            .mobile-remove-image-btn:hover {
                background: rgba(255, 59, 59, 0.25);
                border-color: rgba(255, 59, 59, 0.6);
                transform: translateY(-1px);
            }

            .mobile-remove-image-btn:active {
                transform: translateY(0);
            }

            .mobile-remove-image-btn::before {
                content: "✕";
                font-size: 16px;
                font-weight: bold;
            }

            .mobile-input-with-image {
                border: 2px solid rgba(255, 255, 255, 0.2);
                background: rgba(74, 158, 255, 0.05) !important;
            }

            .mobile-image-upload-active {
                background: rgba(74, 158, 255, 0.05) !important;
                border: 2px solid rgba(255, 255, 255, 0.2);
                color:rgb(255, 255, 255) !important;
                transform: scale(1.05);
            }

            @media (max-width: 480px) {
                .mobile-image-preview {
                    left: 12px;
                    right: 12px;
                    padding: 14px;
                }
                
                .mobile-image-preview img {
                    width: 50px;
                    height: 50px;
                }
                
                .mobile-remove-image-btn {
                    min-width: 40px;
                    height: 40px;
                    padding: 8px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    handleImageUpload(e) {
        if (!window.mobileCookieManager?.canUseCookies()) {
            e.preventDefault();
            window.mobileCookieManager?.showMobileCookieNotice();
            return;
        }
        
        if (this.mobileImageInput) {
            this.mobileImageInput.click();
        }
    }

    handleImageSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            this.showMobileToast('Please select a valid image file (JPEG, PNG, GIF, or WebP)', 'warning');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showMobileToast('Image size must be less than 5MB', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.selectedImage = e.target.result;
            this.selectedImageName = file.name;
            this.showImagePreview();
            
         
            if (this.mobileInput) {
                this.mobileInput.classList.add('mobile-input-with-image');
            }
            if (this.mobileImageUploadBtn) {
                this.mobileImageUploadBtn.classList.add('mobile-image-upload-active');
            }
        };
        reader.readAsDataURL(file);
    }

    showImagePreview() {

        const existingPreview = document.getElementById('mobile-image-preview');
        if (existingPreview) {
            existingPreview.remove();
        }
        

        const preview = document.createElement('div');
        preview.id = 'mobile-image-preview';
        preview.className = 'mobile-image-preview';
        preview.innerHTML = `
            <img src="${this.selectedImage}" alt="Preview">
            <div class="mobile-image-preview-info">
                <div class="mobile-image-preview-name">${this.selectedImageName}</div>
                <div class="mobile-image-preview-size">${this.formatFileSize(this.mobileImageInput?.files[0]?.size || 0)}</div>
            </div>
            <button class="mobile-remove-image-btn" type="button" title="Remove image"></button>
        `;
        document.body.appendChild(preview);
        

        const removeBtn = preview.querySelector('.mobile-remove-image-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => this.clearSelectedImage(true));
        }
        
    
        setTimeout(() => {
            preview.classList.add('show');
        }, 10);
    }

    clearSelectedImage(showToast = false) {
        this.selectedImage = null;
        this.selectedImageName = '';
        

        if (this.mobileImageInput) {
            this.mobileImageInput.value = '';
        }
        

        const preview = document.getElementById('mobile-image-preview');
        if (preview) {
            preview.classList.remove('show');
            setTimeout(() => {
                if (preview.parentNode) {
                    preview.remove();
                }
            }, 300);
        }
        
        if (this.mobileInput) {
            this.mobileInput.classList.remove('mobile-input-with-image');
        }
        if (this.mobileImageUploadBtn) {
            this.mobileImageUploadBtn.classList.remove('mobile-image-upload-active');
        }
        
        if (showToast) {
            this.showMobileToast('Image removed', 'removed');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showMobileToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `mobile-toast ${type}`;
        toast.textContent = message;

        const style = document.createElement('style');
        style.textContent = `
            .mobile-toast {
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : type === 'removed' ? '#555555' : '#2196F3'};
                color: white;
                padding: 12px 20px;
                border-radius: 25px;
                z-index: 10001;
                font-size: 0.9rem;
                font-weight: 500;
                animation: slideDown 0.3s ease;
            }

            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
            style.remove();
        }, 3000);
    }

    handleKeydown(e) {
        if (!window.mobileCookieManager?.canUseCookies()) {
            e.preventDefault();
            window.mobileCookieManager?.showMobileCookieNotice();
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    handleInputFocus(e) {
        if (!window.mobileCookieManager?.canUseCookies()) {
            e.target.blur();
            window.mobileCookieManager?.showMobileCookieNotice();
            return;
        }
    }

    handleSignin(e) {
        if (!window.mobileCookieManager?.canUseCookies()) {
            e.preventDefault();
            window.mobileCookieManager?.showMobileCookieNotice();
            return;
        }
        window.location.href = 'Auth/signin.html';
    }

    async sendMessage(e) {
        if (e) e.preventDefault();

        if (!window.mobileCookieManager?.canUseCookies()) {
            window.mobileCookieManager?.showMobileCookieNotice();
            return;
        }

        const message = this.mobileInput.value.trim();
        if (!message && !this.selectedImage) return;

        if (!this.currentChatId) {
            this.currentChatId = this.generateChatId();
            this.allChats[this.currentChatId] = {
                id: this.currentChatId,
                title: message ? (message.length > 30 ? message.substring(0, 30) + "..." : message) : "Image Chat",
                messages: [],
                createdAt: new Date().toISOString()
            };
        }

        this.showChatInterface();
        const userMessageDiv = this.addUserMessage(message, this.selectedImage);
        this.saveMessage('user', message || "Image shared");

         
        this.mobileInput.value = '';
        this.mobileInput.style.height = 'auto';
        const tempImage = this.selectedImage;
        this.clearSelectedImage(false); 
        const typingDiv = this.addMessage('bot', 'Flicker AI is typing...');
        this.mobileInput.disabled = true;

        try {
            const body = { message: message || "What do you see in this image?" };
            if (tempImage) body.image = tempImage;

            const response = await fetch("https://flickerbackend6.onrender.com", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            const reply = data.reply || data.error || "No response received";

            this.typeEffect(typingDiv, reply);
            this.saveMessage('bot', reply);
            this.updateChatList();

        } catch (error) {
            console.error('Error:', error);
            typingDiv.textContent = 'Error connecting to AI. Please try again.';
            typingDiv.className = 'mobile-message error';
        } finally {
            this.mobileInput.disabled = false;
        }
    }

    addUserMessage(text, image) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'mobile-message user';

        if (image) {
            const img = document.createElement('img');
            img.src = image;
            img.style.cssText = 'max-width: 250px; max-height: 200px; border-radius: 8px; margin-bottom: 8px; display: block;';
            messageDiv.appendChild(img);
        }

        if (text) {
            const textDiv = document.createElement('div');
            textDiv.textContent = text;
            messageDiv.appendChild(textDiv);
        }

        this.mobileChat.appendChild(messageDiv);
        this.scrollToBottom();

        return messageDiv;
    }

    addMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `mobile-message ${sender}`;
        messageDiv.textContent = text;

        this.mobileChat.appendChild(messageDiv);
        this.scrollToBottom();

        return messageDiv;
    }

    typeEffect(element, text, speed = 30) {
        let i = 0;
        element.textContent = '';

        const type = () => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                this.scrollToBottom();
                setTimeout(type, speed);
            }
        };

        type();
    }

    scrollToBottom() {
        if (this.mobileChat) {
            this.mobileChat.scrollTop = this.mobileChat.scrollHeight;
        }
    }

    showChatInterface() {
        if (this.mobileWelcome) {
            this.mobileWelcome.style.display = 'none';
        }
        if (this.mobileChatContainer) {
            this.mobileChatContainer.classList.add('active');
        }
    }

createNewChat(e) {
if (e) e.preventDefault();

if (!window.mobileCookieManager?.canUseCookies()) {
window.mobileCookieManager?.showMobileCookieNotice();
return;
}

this.currentChatId = null;
this.mobileChat.innerHTML = '';

if (this.mobileWelcome) {
this.mobileWelcome.style.display = 'flex';
}
if (this.mobileChatContainer) {
this.mobileChatContainer.classList.remove('active');
}

this.closeSidebar();
this.updateChatList();
}

generateChatId() {
return 'mobile_chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

saveMessage(sender, text) {
if (!this.currentChatId) return;

this.allChats[this.currentChatId].messages.push({
sender,
text,
timestamp: new Date().toISOString()
});

this.saveChats();
}

saveChats() {
if (window.mobileCookieManager?.canUseCookies()) {
window.mobileCookieManager.setItem(this.CHATS_STORAGE_KEY, JSON.stringify(this.allChats));
if (this.currentChatId) {
window.mobileCookieManager.setItem(this.CURRENT_CHAT_KEY, this.currentChatId);
}
}
}

loadChats() {
if (!window.mobileCookieManager?.canUseCookies()) return;

try {
const stored = window.mobileCookieManager.getItem(this.CHATS_STORAGE_KEY);
if (stored) {
this.allChats = JSON.parse(stored);
}

const lastChatId = window.mobileCookieManager.getItem(this.CURRENT_CHAT_KEY);
if (lastChatId && this.allChats[lastChatId]) {
this.switchToChat(lastChatId);
}
} catch (error) {
console.error('Error loading chats:', error);
}

this.updateChatList();
}

switchToChat(chatId) {
if (!this.allChats[chatId]) return;

this.currentChatId = chatId;
this.mobileChat.innerHTML = '';


this.allChats[chatId].messages.forEach(({ sender, text }) => {
this.addMessage(sender, text);
});

this.showChatInterface();
this.closeSidebar();
this.updateChatList();
}

updateChatList() {
if (!this.mobileChatList) return;

this.mobileChatList.innerHTML = '';

const chatIds = Object.keys(this.allChats).sort((a, b) => {
return new Date(this.allChats[b].createdAt) - new Date(this.allChats[a].createdAt);
});

chatIds.forEach(chatId => {
const chat = this.allChats[chatId];
const li = document.createElement('li');
li.className = 'mobile-chat-item';
li.textContent = chat.title;

if (chatId === this.currentChatId) {
li.classList.add('active');
}

li.addEventListener('click', () => {
if (window.mobileCookieManager?.canUseCookies()) {
this.switchToChat(chatId);
} else {
window.mobileCookieManager?.showMobileCookieNotice();
}
});

this.mobileChatList.appendChild(li);
});
}

closeSidebar() {
if (this.mobileSidebar) {
this.mobileSidebar.classList.remove('open');
}
if (this.mobileOverlay) {
this.mobileOverlay.classList.remove('active');
}
}
}


let mobileCookieManager;
let mobileChatManager;

document.addEventListener('DOMContentLoaded', function() {

mobileCookieManager = new MobileCookieManager();
window.mobileCookieManager = mobileCookieManager;


setTimeout(() => {
mobileChatManager = new MobileChatManager();
window.mobileChatManager = mobileChatManager;
}, 100);
});


window.getMobileCookieManager = () => window.mobileCookieManager;
window.getMobileChatManager = () => window.mobileChatManager;