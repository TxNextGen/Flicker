document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileSidebar = document.getElementById('mobile-sidebar');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const mobileWelcome = document.getElementById('mobile-welcome');
    const mobileChatContainer = document.getElementById('mobile-chat-container');
    const mobileInput = document.getElementById('mobile-input');
    const mobileSend = document.getElementById('mobile-send');
    const mobileChat = document.getElementById('mobile-chat');
    

    mobileMenuToggle.addEventListener('click', function() {
        mobileSidebar.classList.toggle('open');
        mobileOverlay.classList.toggle('active');
    });
    
    mobileOverlay.addEventListener('click', function() {
        mobileSidebar.classList.remove('open');
        mobileOverlay.classList.remove('active');
    });
    
    
    mobileInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });
    
   
    document.getElementById('mobile-signin').addEventListener('click', function() {
        window.location.href = 'Auth/signin.html';
    });

   
    function updateChatListWithEvents() {
        const mobileChatList = document.getElementById('mobile-chat-list');
        if (!mobileChatList) return;

    
        const newChatList = mobileChatList.cloneNode(false);
        mobileChatList.parentNode.replaceChild(newChatList, mobileChatList);


        if (window.mobileChatManager && window.mobileChatManager.allChats) {
            const chatIds = Object.keys(window.mobileChatManager.allChats).sort((a, b) => {
                return new Date(window.mobileChatManager.allChats[b].createdAt) - new Date(window.mobileChatManager.allChats[a].createdAt);
            });

            chatIds.forEach(chatId => {
                const chat = window.mobileChatManager.allChats[chatId];
                const li = document.createElement('li');
                li.className = 'mobile-chat-item';
                li.dataset.chatId = chatId;

                if (chatId === window.mobileChatManager.currentChatId) {
                    li.classList.add('active');
                }

                li.innerHTML = `
                    <span class="mobile-chat-item-text">${chat.title}</span>
                    <button class="mobile-chat-menu-btn" data-chat-id="${chatId}">
                        <img src="images/dots.png" alt="Menu" />
                    </button>
                    <div class="mobile-chat-menu" data-chat-id="${chatId}">
                        <div class="mobile-chat-menu-item rename-chat" data-chat-id="${chatId}">Rename</div>
                        <div class="mobile-chat-menu-item delete-chat delete" data-chat-id="${chatId}">Delete</div>
                    </div>
                `;
                li.addEventListener('click', (e) => {
                    if (!e.target.closest('.mobile-chat-menu-btn') && !e.target.closest('.mobile-chat-menu')) {
                        if (window.mobileCookieManager?.canUseCookies()) {
                            window.mobileChatManager.switchToChat(chatId);
                        } else {
                            window.mobileCookieManager?.showMobileCookieNotice();
                        }
                    }
                });

                const menuBtn = li.querySelector('.mobile-chat-menu-btn');
                menuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleChatMenu(chatId);
                });

                const renameBtn = li.querySelector('.rename-chat');
                const deleteBtn = li.querySelector('.delete-chat');

                renameBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeAllChatMenus();
                    showRenameDialog(chatId);
                });

                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeAllChatMenus();
                    deleteChat(chatId);
                });

                newChatList.appendChild(li);
            });
        }

        newChatList.id = 'mobile-chat-list';
    }

    function toggleChatMenu(chatId) {
        closeAllChatMenus();
        const menu = document.querySelector(`.mobile-chat-menu[data-chat-id="${chatId}"]`);
        if (menu) {
            menu.classList.add('show');
        }
    }

    function closeAllChatMenus() {
        document.querySelectorAll('.mobile-chat-menu').forEach(menu => {
            menu.classList.remove('show');
        });
    }

    function showRenameDialog(chatId) {
        if (!window.mobileChatManager || !window.mobileChatManager.allChats[chatId]) return;

        const popup = document.getElementById('mobile-rename-popup');
        const input = document.getElementById('mobile-rename-input');
        
        if (popup && input) {
            input.value = window.mobileChatManager.allChats[chatId].title;
            popup.classList.add('show');
            popup.dataset.chatId = chatId;
            
            setTimeout(() => {
                input.focus();
                input.select();
            }, 100);
        }
    }

    function saveRename() {
        const popup = document.getElementById('mobile-rename-popup');
        const input = document.getElementById('mobile-rename-input');
        const chatId = popup?.dataset.chatId;

        if (!chatId || !input || !window.mobileChatManager) return;

        const newTitle = input.value.trim();
        if (newTitle && window.mobileChatManager.allChats[chatId]) {
            window.mobileChatManager.allChats[chatId].title = newTitle;
            window.mobileChatManager.saveChats();
            updateChatListWithEvents();
        }

        popup.classList.remove('show');
        delete popup.dataset.chatId;
    }

    function cancelRename() {
        const popup = document.getElementById('mobile-rename-popup');
        if (popup) {
            popup.classList.remove('show');
            delete popup.dataset.chatId;
        }
    }

    function deleteChat(chatId) {
        if (!window.mobileChatManager || !confirm('Delete this chat?')) return;

        delete window.mobileChatManager.allChats[chatId];
        
        if (window.mobileChatManager.currentChatId === chatId) {
            window.mobileChatManager.currentChatId = null;
            window.mobileChatManager.mobileChat.innerHTML = '';
            
            if (window.mobileChatManager.mobileWelcome) {
                window.mobileChatManager.mobileWelcome.style.display = 'flex';
            }
            if (window.mobileChatManager.mobileChatContainer) {
                window.mobileChatManager.mobileChatContainer.classList.remove('active');
            }
        }

        window.mobileChatManager.saveChats();
        updateChatListWithEvents();
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.mobile-chat-menu-btn') && !e.target.closest('.mobile-chat-menu')) {
            closeAllChatMenus();
        }
    });

    function enhanceChatManager() {
        if (window.mobileChatManager) {
            const originalUpdate = window.mobileChatManager.updateChatList;
            window.mobileChatManager.updateChatList = function() {
                updateChatListWithEvents();
            };
        }
    }

    setTimeout(() => {
        enhanceChatManager();
        updateChatListWithEvents();

        const saveBtn = document.getElementById('mobile-save-rename');
        const cancelBtn = document.getElementById('mobile-cancel-rename');
        const renameInput = document.getElementById('mobile-rename-input');

        if (saveBtn) saveBtn.addEventListener('click', saveRename);
        if (cancelBtn) cancelBtn.addEventListener('click', cancelRename);
        if (renameInput) {
            renameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') saveRename();
                else if (e.key === 'Escape') cancelRename();
            });
        }

        const renamePopup = document.getElementById('mobile-rename-popup');
        if (renamePopup) {
            renamePopup.addEventListener('click', (e) => {
                if (e.target.id === 'mobile-rename-popup') cancelRename();
            });
        }
    }, 500);
});

document.addEventListener('touchstart', function() {}, true);