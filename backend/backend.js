// Added the cookies this is a experiment text rn 

class CookieManager {
  constructor() {
    this.cookiesAccepted = this.getCookieConsent();
    this.init();
  }

  init() {

    if (this.cookiesAccepted === null) {
      this.showCookieConsent();
    } else if (!this.cookiesAccepted) {

      document.body.classList.add('cookies-declined');
    } else {

      this.loadAnalytics();
    }

    this.bindEvents();
  }

  bindEvents() {
    const acceptBtn = document.getElementById('accept-cookies');
    const declineBtn = document.getElementById('decline-cookies');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => this.acceptCookies());
    }
    if (declineBtn) {
      declineBtn.addEventListener('click', () => this.declineCookies());
    }

   
    if (!this.cookiesAccepted) {
      const restrictedElements = ['#signin-btn', '#add-chat-btn', '#send', '#input'];
      restrictedElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          element.addEventListener('click', (e) => {
            if (!this.cookiesAccepted) {
              e.preventDefault();
              e.stopPropagation();
              this.showCookieNotice();
              return false;
            }
          });
        }
      });
    }
  }

  showCookieConsent() {
    const popup = document.getElementById('cookie-consent');
    if (popup) {
      popup.classList.add('show');
    }
  }

  hideCookieConsent() {
    const popup = document.getElementById('cookie-consent');
    if (popup) {
      popup.classList.remove('show');
    }
  }

  showCookieNotice() {
    const notice = document.getElementById('cookie-notice');
    if (notice) {
      notice.classList.add('show');
    
      setTimeout(() => {
        notice.classList.remove('show');
      }, 5000);
    }
  }

  acceptCookies() {
    this.cookiesAccepted = true;
   
    document.cookie = 'cookieConsent=accepted; path=/; max-age=31536000; SameSite=Strict';
    
    this.hideCookieConsent();
    document.body.classList.remove('cookies-declined');
    this.loadAnalytics();
    

    this.enableChatFeatures();
   
    this.showTemporaryMessage('Cookies accepted! You can now use all features.', 'success');
  }

  declineCookies() {
    this.cookiesAccepted = false;

    
    this.hideCookieConsent();
    document.body.classList.add('cookies-declined');
    
 
    this.disableChatFeatures();
    
  
    this.showTemporaryMessage('Cookies declined. Chat functionality is disabled.', 'info');
  }

  enableChatFeatures() {
    const textarea = document.getElementById('input');
    const sendBtn = document.getElementById('send');
    const addChatBtn = document.getElementById('add-chat-btn');
    
    if (textarea) {
      textarea.disabled = false;
      textarea.placeholder = 'Send a message';
    }
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.style.opacity = '1';
      sendBtn.style.cursor = 'pointer';
    }
    if (addChatBtn) {
      addChatBtn.disabled = false;
      addChatBtn.style.opacity = '1';
      addChatBtn.style.cursor = 'pointer';
    }
  }

  disableChatFeatures() {
    const textarea = document.getElementById('input');
    const sendBtn = document.getElementById('send');
    const addChatBtn = document.getElementById('add-chat-btn');
    
    if (textarea) {
      textarea.disabled = true;
      textarea.placeholder = 'Accept cookies to enable chat';
    }
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.style.opacity = '0.5';
      sendBtn.style.cursor = 'not-allowed';
    }
    if (addChatBtn) {
      addChatBtn.disabled = true;
      addChatBtn.style.opacity = '0.5';
      addChatBtn.style.cursor = 'not-allowed';
    }
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

  showTemporaryMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : '#4a9eff'};
      color: white;
      padding: 15px 20px;
      border-radius: 6px;
      z-index: 10002;
      font-family: 'Raleway', sans-serif;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideInRight 0.3s ease;
    `;
    messageDiv.textContent = message;
    

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      messageDiv.remove();
      style.remove();
    }, 4000);
  }


  canUseCookies() {
    return this.cookiesAccepted === true;
  }

  setCookie(name, value, days = 365) {
    if (!this.canUseCookies()) return false;
    
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
    return true;
  }

  getCookie(name) {
    if (!this.canUseCookies()) return null;
    
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [cookieName, cookieValue] = cookie.trim().split('=');
      if (cookieName === name) {
        return cookieValue;
      }
    }
    return null;
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
    if (!this.canUseCookies()) {
      return null;
    }
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  removeItem(key) {
    if (!this.canUseCookies()) {
      return false;
    }
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  }
}


function showCookieConsent() {
  const popup = document.getElementById('cookie-consent');
  const notice = document.getElementById('cookie-notice');
  if (popup) popup.classList.add('show');
  if (notice) notice.classList.remove('show');
}


let cookieManager;
document.addEventListener('DOMContentLoaded', () => {
  cookieManager = new CookieManager();
  window.cookieManager = cookieManager;
});


window.getCookieManager = () => window.cookieManager || cookieManager;



document.getElementById('signin-btn').addEventListener('click', (e) => {

  if (!window.getCookieManager()?.canUseCookies()) {
    e.preventDefault();
    window.getCookieManager()?.showCookieNotice();
    return;
  }
  window.location.href = 'signin.html';
});

document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("input");
  const chat = document.getElementById("chat");
  const sendBtn = document.getElementById("send");
  const addChatBtn = document.getElementById("add-chat-btn");
  const chatList = document.getElementById("chat-list");

  const CHATS_STORAGE_KEY = "flicker_all_chats";
  const CURRENT_CHAT_KEY = "flicker_current_chat";
  let currentChatId = null;
  let allChats = {};


  function safeLocalStorage() {
    const manager = window.getCookieManager();
    return {
      setItem: (key, value) => manager?.setItem(key, value) || false,
      getItem: (key) => manager?.getItem(key) || null,
      removeItem: (key) => manager?.removeItem(key) || false
    };
  }

  function loadAllChats() {
    try {
      const stored = safeLocalStorage().getItem(CHATS_STORAGE_KEY);
      if (stored) {
        allChats = JSON.parse(stored);
      }

      const lastChatId = safeLocalStorage().getItem(CURRENT_CHAT_KEY);
      if (lastChatId && allChats[lastChatId]) {
        currentChatId = lastChatId;
        switchToChat(lastChatId);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      allChats = {};
    }
  }

  function saveAllChats() {
    try {
      const success = safeLocalStorage().setItem(CHATS_STORAGE_KEY, JSON.stringify(allChats));
      if (success && currentChatId) {
        safeLocalStorage().setItem(CURRENT_CHAT_KEY, currentChatId);
      }
      if (success) {
        console.log('Chats saved to localStorage:', allChats);
      } else {
        console.warn('Cannot save chats - cookies not accepted');
      }
    } catch (error) {
      console.error('Error saving chats:', error);
    }
  }

  function generateChatId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function createNewChat(firstMessage = null) {

    if (!window.getCookieManager()?.canUseCookies()) {
      window.getCookieManager()?.showCookieNotice();
      return null;
    }

    const chatId = generateChatId();

    const chatTitle = firstMessage ?
      (firstMessage.length > 30 ? firstMessage.substring(0, 30) + "..." : firstMessage) :
      "New Chat";

    allChats[chatId] = {
      id: chatId,
      title: chatTitle,
      messages: [],
      createdAt: new Date().toISOString()
    };

    currentChatId = chatId;
    saveAllChats();
    updateChatList();
    return chatId;
  }

  function switchToChat(chatId) {
    if (!allChats[chatId]) return;

    currentChatId = chatId;
    safeLocalStorage().setItem(CURRENT_CHAT_KEY, chatId);
    loadChatMessages(chatId);
    updateChatListSelection();

    const placeholder = document.getElementById("placeholder-container");
    const headerContainer = document.getElementById("header-container");

    if (placeholder) {
      placeholder.style.display = "none";
    }
    if (headerContainer) {
      headerContainer.style.display = "none";
    }
  }

  function loadChatMessages(chatId) {
    if (!allChats[chatId]) return;

    chat.innerHTML = '';

    allChats[chatId].messages.forEach(({ sender, text }) => {
      const div = document.createElement("div");
      div.className = "message " + sender;

      if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
        div.innerHTML = DOMPurify.sanitize(marked.parse(text));
      } else {
        div.textContent = text;
      }
      chat.appendChild(div);
    });

    scrollChatToBottom();
  }

  function saveMessageToCurrentChat(sender, text) {
    if (!currentChatId) return;

    if (!allChats[currentChatId]) {
      allChats[currentChatId] = { 
        id: currentChatId, 
        title: "New Chat", 
        messages: [],
        createdAt: new Date().toISOString()
      };
    }

    allChats[currentChatId].messages.push({ 
      sender, 
      text, 
      timestamp: new Date().toISOString() 
    });

    if (allChats[currentChatId].title === "New Chat" && sender === "user") {
      const newTitle = text.length > 30 ? text.substring(0, 30) + "..." : text;
      allChats[currentChatId].title = newTitle;
    }

    saveAllChats();
  }

  function updateChatList() {
    chatList.innerHTML = '';

    const chatIds = Object.keys(allChats).sort((a, b) => {
      const timeA = allChats[a].createdAt || allChats[a].id.split('_')[1];
      const timeB = allChats[b].createdAt || allChats[b].id.split('_')[1];
      return new Date(timeB) - new Date(timeA);
    });

    chatIds.forEach(chatId => {
      const chatData = allChats[chatId];
      const li = document.createElement('li');
      li.className = 'chat-item';
      if (chatId === currentChatId) {
        li.classList.add('active');
      }

      li.innerHTML = `
        <button class="chat-button" data-chat-id="${chatId}">
          <span class="chat-title">${chatData.title}</span>
          <button class="delete-chat" data-chat-id="${chatId}">×</button>
        </button>
      `;

      chatList.appendChild(li);
    });
  }

  function updateChatListSelection() {
    const chatItems = chatList.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
      const button = item.querySelector('.chat-button');
      if (button.dataset.chatId === currentChatId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  function startNewChat() {
    currentChatId = null;
    safeLocalStorage().removeItem(CURRENT_CHAT_KEY);
    chat.innerHTML = '';

    const placeholder = document.getElementById("placeholder-container");
    const headerContainer = document.getElementById("header-container");

    if (placeholder) {
      placeholder.removeAttribute('style');
    }
    if (headerContainer) {
      headerContainer.removeAttribute('style');
    }

    if (chat) {
      chat.removeAttribute('style');
    }

    updateChatListSelection();
  }

  addChatBtn.addEventListener("click", (e) => {
    if (!window.getCookieManager()?.canUseCookies()) {
      e.preventDefault();
      window.getCookieManager()?.showCookieNotice();
      return;
    }
    startNewChat();
  });

  chatList.addEventListener("click", (e) => {

    if (!window.getCookieManager()?.canUseCookies()) {
      e.preventDefault();
      window.getCookieManager()?.showCookieNotice();
      return;
    }

    if (e.target.classList.contains('chat-button') || e.target.classList.contains('chat-title')) {
      e.preventDefault();
      e.stopPropagation();

      const chatButton = e.target.classList.contains('chat-button') ?
        e.target :
        e.target.closest('.chat-button');

      if (chatButton && chatButton.dataset.chatId) {
        const chatId = chatButton.dataset.chatId;
        switchToChat(chatId);
      }
    } else if (e.target.classList.contains('delete-chat')) {
      e.preventDefault();
      e.stopPropagation();
      const chatId = e.target.dataset.chatId;
      if (chatId && allChats[chatId]) {
        delete allChats[chatId];
        saveAllChats();
        updateChatList();

        if (chatId === currentChatId) {
          startNewChat();
        }
      }
    }
  });

  if (textarea) {

    textarea.addEventListener("focus", (e) => {
      if (!window.getCookieManager()?.canUseCookies()) {
        e.target.blur();
        window.getCookieManager()?.showCookieNotice();
        return;
      }
    });

    textarea.addEventListener("input", function () {
      if (!window.getCookieManager()?.canUseCookies()) {
        this.value = '';
        return;
      }

      this.style.height = "auto";
      const lineHeight = parseFloat(getComputedStyle(this).lineHeight);
      const maxHeight = lineHeight * 8;

      if (this.scrollHeight <= maxHeight) {
        this.style.overflowY = "hidden";
        this.style.height = this.scrollHeight + "px";
      } else {
        this.style.overflowY = "auto";
        this.style.height = maxHeight + "px";
      }
    });

    textarea.addEventListener("keydown", function (e) {
      if (!window.getCookieManager()?.canUseCookies()) {
        e.preventDefault();
        window.getCookieManager()?.showCookieNotice();
        return;
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (sendBtn) sendBtn.click();
      }
    });
  }

  function scrollChatToBottom() {
    if (chat) {
      chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
    }
  }

  function typeEffect(element, fullText, callback, speed = 20) {
    let i = 0;
    element.textContent = "";
    function type() {
      if (i < fullText.length) {
        element.textContent += fullText.charAt(i);
        i++;
        scrollChatToBottom();
        setTimeout(type, speed);
      } else {
        if (callback) callback();
      }
    }
    type();
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", async (e) => {
 
      if (!window.getCookieManager()?.canUseCookies()) {
        e.preventDefault();
        window.getCookieManager()?.showCookieNotice();
        return;
      }

      const userMessage = textarea.value.trim();
      if (!userMessage) return;

      if (!currentChatId) {
        const newChatId = createNewChat(userMessage);
        if (!newChatId) return; 
      }

      const placeholder = document.getElementById("placeholder-container");
      const headerContainer = document.getElementById("header-container");
      const chatContainer = document.getElementById("chat-container") || chat.parentElement;

      if (placeholder) {
        placeholder.style.display = "none";
        placeholder.style.visibility = "hidden";
      }
      if (headerContainer) {
        headerContainer.style.display = "none";
        headerContainer.style.visibility = "hidden";
      }
      if (chatContainer) {
        chatContainer.style.display = "flex";
        chatContainer.style.visibility = "visible";
      }

      const userDiv = document.createElement("div");
      userDiv.className = "message user";
      userDiv.textContent = userMessage;
      chat.appendChild(userDiv);
      scrollChatToBottom();

      saveMessageToCurrentChat("user", userMessage);

      textarea.value = "";
      textarea.style.height = "auto";

      const aiDiv = document.createElement("div");
      aiDiv.className = "message ai";
      aiDiv.textContent = "Flicker AI is typing...";
      chat.appendChild(aiDiv);
      scrollChatToBottom();

      textarea.disabled = true;

      try {
        const res = await fetch("https://flickerbackend2.onrender.com", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage })
        });

        const data = await res.json();
        const reply = typeof data.reply === "string" ? data.reply :
          typeof data.error === "string" ? data.error :
          "No response";

        typeEffect(aiDiv, reply, () => {
          if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
            aiDiv.innerHTML = DOMPurify.sanitize(marked.parse(reply));
          } else {
            aiDiv.textContent = reply;
          }
          scrollChatToBottom();
          textarea.disabled = false;
          textarea.focus();

          saveMessageToCurrentChat("ai", reply);
          updateChatList();
        });

      } catch (err) {
        aiDiv.className = "message error";
        aiDiv.textContent = "Error talking to AI.";
        console.error(err);
        textarea.disabled = false;
        textarea.focus();

        saveMessageToCurrentChat("error", "Error talking to AI.");
      }
    });
  }

  function clearAllChats() {
    if (!window.getCookieManager()?.canUseCookies()) {
      window.getCookieManager()?.showCookieNotice();
      return;
    }

    if (confirm('Are you sure you want to delete all chats? This cannot be undone.')) {
      safeLocalStorage().removeItem(CHATS_STORAGE_KEY);
      safeLocalStorage().removeItem(CURRENT_CHAT_KEY);
      allChats = {};
      currentChatId = null;
      startNewChat();
      updateChatList();
      console.log('All chats cleared');
    }
  }

  window.clearAllChats = clearAllChats;
  

  const initializeChats = () => {
    if (window.getCookieManager()?.canUseCookies()) {
      loadAllChats();
      updateChatList();
    } else if (window.getCookieManager()?.canUseCookies() === false) {

      console.log('Cookies declined - chat functionality disabled');
    } else {

      setTimeout(initializeChats, 100);
    }
  };


  setTimeout(initializeChats, 50);
});

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggle-btn');
  const body = document.body;

  if (!sidebar || !toggleBtn || !body) return;

  sidebar.classList.toggle('close');
  toggleBtn.classList.toggle('rotated');

  if (sidebar.classList.contains('close')) {
    body.style.gridTemplateColumns = '60px 1fr';
  } else {
    body.style.gridTemplateColumns = '250px 1fr';
  }

  setTimeout(() => {
    const chatContainer = document.getElementById('chat');
    const placeholder = document.getElementById("placeholder-container");

    if (chatContainer) {
      chatContainer.style.width = '';
      chatContainer.offsetWidth; 
    }

    if (placeholder) {
      placeholder.style.width = '';
      placeholder.offsetWidth; 
    }

    window.dispatchEvent(new Event('resize'));
  }, 100);
}