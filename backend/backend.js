class CookieManager {
constructor() {
this.cookiesAccepted = this.getCookieConsent();
this.init();
}

init() {
if (this.cookiesAccepted === null) this.showCookieConsent();
else if (!this.cookiesAccepted) document.body.classList.add('cookies-declined');
else this.loadAnalytics();
this.bindEvents();
}

bindEvents() {
const acceptBtn = document.getElementById('accept-cookies');
const declineBtn = document.getElementById('decline-cookies');

acceptBtn?.addEventListener('click', () => this.acceptCookies());
declineBtn?.addEventListener('click', () => this.declineCookies());

if (!this.cookiesAccepted) {
['#signin-btn', '#add-chat-btn', '#send', '#input', '#image-upload-btn'].forEach(sel => {
document.querySelector(sel)?.addEventListener('click', e => {
if (!this.cookiesAccepted) {
e.preventDefault();
e.stopPropagation();
this.showCookieNotice();
return false;
}
});
});
}
}

showCookieConsent() { document.getElementById('cookie-consent')?.classList.add('show'); }
hideCookieConsent() { document.getElementById('cookie-consent')?.classList.remove('show'); }

showCookieNotice() {
const notice = document.getElementById('cookie-notice');
if (notice) {
notice.classList.add('show');
setTimeout(() => notice.classList.remove('show'), 5000);
}
}

acceptCookies() {
this.cookiesAccepted = true;
document.cookie = 'cookieConsent=accepted; path=/; max-age=31536000; SameSite=Strict';
this.hideCookieConsent();
document.body.classList.remove('cookies-declined');
this.loadAnalytics();
this.enableChatFeatures();
this.showMessage('Cookies accepted! You can now use all features.', 'success');
}

declineCookies() {
this.cookiesAccepted = false;
this.hideCookieConsent();
document.body.classList.add('cookies-declined');
this.disableChatFeatures();
this.showMessage('Cookies declined. Chat functionality is disabled.', 'info');
}

toggleChatFeatures(enable) {
const elements = ['input', 'send', 'add-chat-btn', 'image-upload-btn'];
elements.forEach(id => {
const el = document.getElementById(id);
if (el) {
el.disabled = !enable;
el.style.opacity = enable ? '1' : '0.5';
el.style.cursor = enable ? 'pointer' : 'not-allowed';
if (id === 'input') el.placeholder = enable ? 'Send a message' : 'Accept cookies to enable chat';
}
});
}

enableChatFeatures() { this.toggleChatFeatures(true); }
disableChatFeatures() { this.toggleChatFeatures(false); }

getCookieConsent() {
const cookies = document.cookie.split(';');
for (let cookie of cookies) {
const [name, value] = cookie.trim().split('=');
if (name === 'cookieConsent') return value === 'accepted';
}
return null;
}

loadAnalytics() {
const script = document.getElementById('gtag-script');
if (script?.type === 'text/plain') {
const newScript = document.createElement('script');
newScript.innerHTML = script.innerHTML;
document.head.appendChild(newScript);
script.type = 'text/javascript';
}
}

showMessage(message, type = 'info') {
const div = document.createElement('div');
div.style.cssText = `position:fixed;top:20px;right:20px;background:${type === 'success' ? '#4CAF50' : '#4a9eff'};color:white;padding:15px 20px;border-radius:6px;z-index:10002;font-family:'Raleway',sans-serif;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.3);animation:slideInRight 0.3s ease`;
div.textContent = message;

if (!document.getElementById('slide-animation')) {
const style = document.createElement('style');
style.id = 'slide-animation';
style.textContent = '@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}';
document.head.appendChild(style);
}

document.body.appendChild(div);
setTimeout(() => div.remove(), 4000);
}

canUseCookies() { return this.cookiesAccepted === true; }

setCookie(name, value, days = 365) {
if (!this.canUseCookies()) return false;
const expires = new Date(Date.now() + days * 864e5);
document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
return true;
}

getCookie(name) {
if (!this.canUseCookies()) return null;
const cookies = document.cookie.split(';');
for (let cookie of cookies) {
const [cookieName, cookieValue] = cookie.trim().split('=');
if (cookieName === name) return cookieValue;
}
return null;
}

storageMethod(method, key, value) {
if (!this.canUseCookies()) {
if (method === 'set') console.warn('Cannot save to localStorage - cookies declined');
return method === 'set' ? false : null;
}
try {
return method === 'set' ? (localStorage.setItem(key, value), true) :
method === 'get' ? localStorage.getItem(key) :
(localStorage.removeItem(key), true);
} catch (error) {
console.error(`Error ${method}ting localStorage:`, error);
return method === 'set' ? false : null;
}
}

setItem(key, value) { return this.storageMethod('set', key, value); }
getItem(key) { return this.storageMethod('get', key); }
removeItem(key) { return this.storageMethod('remove', key); }
}


class ChatSystem {
constructor() {
this.selectedImage = null;
this.selectedImageName = '';
this.currentRenamingChatId = null;
this.currentChatId = null;
this.allChats = {};
this.CHATS_KEY = "flicker_all_chats";
this.CURRENT_KEY = "flicker_current_chat";
this.chatBarMoved = false; 
this.typingInterval = null; 
this.init();
}

init() {
this.elements = {
textarea: document.getElementById("input"),
chat: document.getElementById("chat"),
sendBtn: document.getElementById("send"),
addChatBtn: document.getElementById("add-chat-btn"),
chatList: document.getElementById("chat-list"),
imageUploadBtn: document.getElementById('image-upload-btn'),
imageInput: document.getElementById('image-input'),
imagePreview: document.getElementById('image-preview'),
removeImageBtn: document.getElementById('remove-image-btn'),
inputArea: document.getElementById('input-area') 
};

this.createRenamePopup();
this.bindEvents();
this.initializeChats();
this.addTypingStyles();
}
addTypingStyles() {
const existingStyle = document.getElementById('typing-styles');
if (existingStyle) existingStyle.remove();

const style = document.createElement('style');
style.id = 'typing-styles';
style.textContent = `
.typing-indicator {
display: flex;
align-items: center;
padding: 8px;
margin-left: -50px;
}

.typing-dots {
display: flex;
gap: 4px;
align-items: center;
}

.typing-dot {
width: 35px;
height: 20px;
border-radius: 50%;
background-color: #555;
display: inline-block;
animation: typingPulse 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) { animation-delay: 0s; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typingPulse {
0%, 60%, 100% {
transform: scale(1);
opacity: 0.4;
}
30% {
transform: scale(1.3);
opacity: 0.9;
}
}
`;
document.head.appendChild(style);
}

createTypingIndicator() {
const typingDiv = document.createElement("div");
typingDiv.className = "message ai";
const dot1 = document.createElement("span");
dot1.className = "typing-dot";
dot1.style.cssText = "width:8px!important;height:8px!important;background:#666!important;border-radius:50%!important;display:inline-block!important;animation:typingPulse 1.4s infinite ease-in-out!important;animation-delay:0s!important;margin:0 2px!important;";

const dot2 = document.createElement("span");
dot2.className = "typing-dot";
dot2.style.cssText = "width:8px!important;height:8px!important;background:#666!important;border-radius:50%!important;display:inline-block!important;animation:typingPulse 1.4s infinite ease-in-out!important;animation-delay:0.2s!important;margin:0 2px!important;";

const dot3 = document.createElement("span");
dot3.className = "typing-dot";
dot3.style.cssText = "width:8px!important;height:8px!important;background:#666!important;border-radius:50%!important;display:inline-block!important;animation:typingPulse 1.4s infinite ease-in-out!important;animation-delay:0.4s!important;margin:0 2px!important;";

const dotsContainer = document.createElement("div");
dotsContainer.className = "typing-dots";
dotsContainer.style.cssText = "display:flex!important;gap:4px!important;align-items:center!important;";
dotsContainer.appendChild(dot1);
dotsContainer.appendChild(dot2);
dotsContainer.appendChild(dot3);

const indicator = document.createElement("div");
indicator.className = "typing-indicator";
indicator.style.cssText = "display:flex!important;align-items:center!important;padding:8px!important;margin-left:-50px!important;";
indicator.appendChild(dotsContainer);

typingDiv.appendChild(indicator);
return typingDiv;
}



moveChatBarDown() {
const inputArea = this.elements.inputArea;
if (!inputArea || this.chatBarMoved) return;


inputArea.style.transition = 'bottom 0.5s ease-in-out';

inputArea.style.bottom = '20px';

this.chatBarMoved = true;
}


resetChatBarPosition() {
const inputArea = this.elements.inputArea;
if (!inputArea) return;

inputArea.style.transition = 'bottom 0.5s ease-in-out';
inputArea.style.bottom = '320px';
this.chatBarMoved = false;
}

bindEvents() {
const {textarea, sendBtn, addChatBtn, imageUploadBtn, imageInput, removeImageBtn} = this.elements;

imageUploadBtn?.addEventListener('click', e => {
if (!this.checkCookies(e)) return;
imageInput.click();
});
imageInput?.addEventListener('change', e => this.handleImageSelect(e));
removeImageBtn?.addEventListener('click', () => this.clearSelectedImage());

addChatBtn?.addEventListener("click", e => {
if (!this.checkCookies(e)) return;
this.startNewChat();
});

sendBtn?.addEventListener("click", e => this.sendMessage(e));

if (textarea) {
textarea.addEventListener("focus", e => { if (!this.checkCookies(e)) e.target.blur(); });
textarea.addEventListener("input", () => this.autoResize());
textarea.addEventListener("keydown", e => {
if (!this.checkCookies(e)) return;
if (e.key === "Enter" && !e.shiftKey) {
e.preventDefault();
sendBtn?.click();
}
});
}

document.addEventListener('click', e => {
if (!e.target.closest('.chat-menu-btn') && !e.target.closest('.chat-menu')) {
this.closeAllMenus();
}
});
}

checkCookies(e) {
if (!window.getCookieManager()?.canUseCookies()) {
e?.preventDefault();
window.getCookieManager()?.showCookieNotice();
return false;
}
return true;
}

autoResize() {
const {textarea} = this.elements;
if (!this.checkCookies()) { textarea.value = ''; return; }

textarea.style.height = "auto";
const maxHeight = parseFloat(getComputedStyle(textarea).lineHeight) * 8;

if (textarea.scrollHeight <= maxHeight) {
textarea.style.overflowY = "hidden";
textarea.style.height = textarea.scrollHeight + "px";
} else {
textarea.style.overflowY = "auto";
textarea.style.height = maxHeight + "px";
}
}

handleImageSelect(event) {
const file = event.target.files[0];
if (!file) return;

const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
if (!validTypes.includes(file.type)) {
alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
return;
}

if (file.size > 5 * 1024 * 1024) {
alert('Image size must be less than 5MB');
return;
}

const reader = new FileReader();
reader.onload = e => {
this.selectedImage = e.target.result;
this.selectedImageName = file.name;
this.showImagePreview();

const input = document.getElementById('input');
const uploadBtn = document.getElementById('image-upload-btn');
input?.classList.add('with-image');
if (uploadBtn) uploadBtn.style.background = 'rgba(74, 158, 255, 0.2)';
};
reader.readAsDataURL(file);
}

showImagePreview() {
const preview = this.elements.imagePreview;
if (!preview) return;

const img = preview.querySelector('img');
const name = preview.querySelector('.image-preview-name');

if (img) img.src = this.selectedImage;
if (name) name.textContent = this.selectedImageName;
preview.classList.add('show');
}

clearSelectedImage() {
this.selectedImage = null;
this.selectedImageName = '';

const {imageInput, imagePreview} = this.elements;
if (imageInput) imageInput.value = '';
imagePreview?.classList.remove('show');

const input = document.getElementById('input');
const uploadBtn = document.getElementById('image-upload-btn');
input?.classList.remove('with-image');
if (uploadBtn) uploadBtn.style.background = 'transparent';
}

safeStorage() {
const manager = window.getCookieManager();
return {
setItem: (key, value) => manager?.setItem(key, value) || false,
getItem: (key) => manager?.getItem(key) || null,
removeItem: (key) => manager?.removeItem(key) || false
};
}

loadAllChats() {
try {
const stored = this.safeStorage().getItem(this.CHATS_KEY);
if (stored) this.allChats = JSON.parse(stored);

const lastChatId = this.safeStorage().getItem(this.CURRENT_KEY);
if (lastChatId && this.allChats[lastChatId]) {
this.currentChatId = lastChatId;
this.switchToChat(lastChatId);
}
} catch (error) {
console.error('Error loading chats:', error);
this.allChats = {};
}
}

saveAllChats() {
try {
const success = this.safeStorage().setItem(this.CHATS_KEY, JSON.stringify(this.allChats));
if (success && this.currentChatId) {
this.safeStorage().setItem(this.CURRENT_KEY, this.currentChatId);
}
} catch (error) {
console.error('Error saving chats:', error);
}
}

generateChatId() {
return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

createNewChat(firstMessage = null) {
if (!this.checkCookies()) return null;

const chatId = this.generateChatId();
const chatTitle = firstMessage ?
(firstMessage.length > 30 ? firstMessage.substring(0, 30) + "..." : firstMessage) :
"New Chat";

this.allChats[chatId] = {
id: chatId,
title: chatTitle,
messages: [],
createdAt: new Date().toISOString()
};

this.currentChatId = chatId;
this.saveAllChats();
this.updateChatList();
return chatId;
}

switchToChat(chatId) {
if (!this.allChats[chatId]) return;

this.currentChatId = chatId;
this.safeStorage().setItem(this.CURRENT_KEY, chatId);
this.loadChatMessages(chatId);
this.updateChatListSelection();
this.hidePlaceholderContent();
if (this.allChats[chatId].messages.length > 0) {
this.moveChatBarDown();
}
}

hidePlaceholderContent() {
const quoteContainer = document.querySelector('.quote-container');
if (quoteContainer) {
quoteContainer.style.display = 'none';
}


const dynamicQuote = document.getElementById('dynamic-quote');
if (dynamicQuote) {
dynamicQuote.style.display = 'none';
}

const placeholderSelectors = [
'.quote-container',
'#dynamic-quote',
'.placeholder-container',
'#placeholder-container',
'.header-container',
'#header-container'
];

placeholderSelectors.forEach(selector => {
const elements = document.querySelectorAll(selector);
elements.forEach(el => {
if (el) {
el.style.display = 'none';
}
});
});


const chatContainer = document.getElementById('chat');
if (chatContainer) {
chatContainer.style.display = 'block';
chatContainer.style.visibility = 'visible';
}
}


showPlaceholderContent() {
if (this.currentChatId) return;
const quoteContainer = document.querySelector('.quote-container');
if (quoteContainer) {
quoteContainer.style.display = 'block';
}

const dynamicQuote = document.getElementById('dynamic-quote');
if (dynamicQuote) {
dynamicQuote.style.display = 'block';
}

const placeholderSelectors = [
'.quote-container',
'#dynamic-quote',
'.placeholder-container',
'#placeholder-container',
'.header-container',
'#header-container'
];

placeholderSelectors.forEach(selector => {
const elements = document.querySelectorAll(selector);
elements.forEach(el => {
if (el) {
el.style.display = 'block';
}
});
});
}

loadChatMessages(chatId) {
if (!this.allChats[chatId]) return;

this.elements.chat.innerHTML = '';
this.allChats[chatId].messages.forEach(({sender, text}) => {
const div = document.createElement("div");
div.className = "message " + sender;

if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
div.innerHTML = DOMPurify.sanitize(marked.parse(text));
} else {
div.textContent = text;
}
this.elements.chat.appendChild(div);
});

this.scrollToBottom();
}

saveMessage(sender, text) {
if (!this.currentChatId) return;

if (!this.allChats[this.currentChatId]) {
this.allChats[this.currentChatId] = {
id: this.currentChatId,
title: "New Chat",
messages: [],
createdAt: new Date().toISOString()
};
}

this.allChats[this.currentChatId].messages.push({
sender, text, timestamp: new Date().toISOString()
});

if (this.allChats[this.currentChatId].title === "New Chat" && sender === "user") {
this.allChats[this.currentChatId].title = text.length > 30 ?
text.substring(0, 30) + "..." : text;
}

this.saveAllChats();
}

createRenamePopup() {
if (document.getElementById('rename-popup')) return;

const popup = document.createElement('div');
popup.id = 'rename-popup';
popup.className = 'popup-overlay';
popup.innerHTML = `
<div class="popup-content">
<h3>Rename Chat</h3>
<input type="text" id="rename-input" placeholder="Enter new chat name">
<div class="popup-buttons">
<button id="cancel-rename" class="popup-btn cancel-btn">Cancel</button>
<button id="save-rename" class="popup-btn save-btn">Save</button>
</div>
</div>
`;

document.body.appendChild(popup);

document.getElementById('save-rename')?.addEventListener('click', () => this.saveRename());
document.getElementById('cancel-rename')?.addEventListener('click', () => this.cancelRename());

const input = document.getElementById('rename-input');
input?.addEventListener('keydown', e => {
if (e.key === 'Enter') this.saveRename();
else if (e.key === 'Escape') this.cancelRename();
});

popup.addEventListener('click', e => {
if (e.target === popup) this.cancelRename();
});
}

updateChatList() {
const {chatList} = this.elements;
if (!chatList) return;

chatList.innerHTML = '';
const sortedIds = Object.keys(this.allChats).sort((a, b) =>
new Date(this.allChats[b].createdAt || this.allChats[b].id.split('_')[1]) -
new Date(this.allChats[a].createdAt || this.allChats[a].id.split('_')[1])
);

sortedIds.forEach(chatId => {
const chat = this.allChats[chatId];
const li = document.createElement('li');
li.className = 'chat-item' + (chatId === this.currentChatId ? ' active' : '');
li.setAttribute('data-chat-id', chatId);

li.innerHTML = `
<button class="chat-button" data-chat-id="${chatId}" type="button">
<span class="chat-title">${chat.title}</span>
</button>
<button class="chat-menu-btn" type="button">
<img src="images/dots.png" alt="Menu" class="menu-icon">
</button>
<div class="chat-menu">
<button class="menu-option rename-option" type="button">Rename Chat</button>
<button class="menu-option delete-option" type="button">Delete</button>
</div>
`;

chatList.appendChild(li);
this.bindChatEvents(li, chatId, chat);
});
}

bindChatEvents(item, chatId, chat) {
const button = item.querySelector('.chat-button');
const menuBtn = item.querySelector('.chat-menu-btn');
const menu = item.querySelector('.chat-menu');
const rename = item.querySelector('.rename-option');
const del = item.querySelector('.delete-option');

button?.addEventListener('click', e => {
e.preventDefault();
if (this.checkCookies()) this.switchToChat(chatId);
});

menuBtn?.addEventListener('click', e => {
e.preventDefault();
e.stopPropagation();
this.closeAllMenus();
menu.classList.add('show');
});

rename?.addEventListener('click', e => {
e.preventDefault();
this.closeAllMenus();
this.openRenamePopup(chatId, chat.title);
});

del?.addEventListener('click', e => {
e.preventDefault();
this.closeAllMenus();
this.deleteChat(chatId);
});
}

closeAllMenus() {
document.querySelectorAll('.chat-menu').forEach(menu => menu.classList.remove('show'));
}

openRenamePopup(chatId, title) {
this.currentRenamingChatId = chatId;
const input = document.getElementById('rename-input');
const popup = document.getElementById('rename-popup');

if (input) input.value = title;
popup?.classList.add('show');
setTimeout(() => { input?.focus(); input?.select(); }, 100);
}

saveRename() {
const input = document.getElementById('rename-input');
if (!this.currentRenamingChatId || !input) return;

const newTitle = input.value.trim();
if (!newTitle) return;

if (this.allChats[this.currentRenamingChatId]) {
this.allChats[this.currentRenamingChatId].title = newTitle;
this.saveAllChats();
this.updateChatList();
}
this.cancelRename();
}

cancelRename() {
this.currentRenamingChatId = null;
document.getElementById('rename-popup')?.classList.remove('show');
const input = document.getElementById('rename-input');
if (input) input.value = '';
}

deleteChat(chatId) {
if (!chatId || !this.allChats[chatId]) return;

if (confirm('Are you sure you want to delete this chat? This cannot be undone.')) {
delete this.allChats[chatId];
this.saveAllChats();
this.updateChatList();
if (chatId === this.currentChatId) this.startNewChat();
}
}

updateChatListSelection() {
this.elements.chatList.querySelectorAll('.chat-item').forEach(item => {
item.classList.toggle('active', item.getAttribute('data-chat-id') === this.currentChatId);
});
}

startNewChat() {
this.currentChatId = null;
this.safeStorage().removeItem(this.CURRENT_KEY);
this.elements.chat.innerHTML = '';


this.resetChatBarPosition();
this.showPlaceholderContent();
this.updateChatListSelection();
}

scrollToBottom() {
this.elements.chat?.scrollTo({top: this.elements.chat.scrollHeight, behavior: 'smooth'});
}

typeEffect(element, text, callback, speed = 20) {
let i = 0;
element.textContent = "";
const type = () => {
if (i < text.length) {
element.textContent += text.charAt(i++);
this.scrollToBottom();
setTimeout(type, speed);
} else callback?.();
};
type();
}

async sendMessage(e) {
if (!this.checkCookies(e)) return;

const {textarea} = this.elements;
const message = textarea.value.trim();

if (!message && !this.selectedImage) return;

if (!this.currentChatId) {
const newId = this.createNewChat(message || "Image");
if (!newId) return;
this.currentChatId = newId; 
}

this.hidePlaceholderContent();
this.moveChatBarDown();

const userDiv = document.createElement("div");
userDiv.className = "message user";

if (this.selectedImage) {
const img = document.createElement("img");
img.src = this.selectedImage;
img.style.cssText = "max-width:300px;max-height:200px;border-radius:8px;margin-bottom:8px;display:block";
userDiv.appendChild(img);
}

if (message) {
const text = document.createElement("div");
text.textContent = message;
userDiv.appendChild(text);
}

this.elements.chat.appendChild(userDiv);
this.scrollToBottom();
this.saveMessage("user", message || "Image shared");

textarea.value = "";
textarea.style.height = "auto";
const tempImage = this.selectedImage;
this.clearSelectedImage();
const aiDiv = this.createTypingIndicator();
this.elements.chat.appendChild(aiDiv);
this.scrollToBottom();

textarea.disabled = true;

try {
const body = {message: message || "What do you see in this image?"};
if (tempImage) body.image = tempImage;

const res = await fetch("https://flickerbackend3.onrender.com", {
method: "POST",
headers: {"Content-Type": "application/json"},
body: JSON.stringify(body)
});

const data = await res.json();
const reply = data.reply || data.error || "No response";
aiDiv.className = "message ai";
this.typeEffect(aiDiv, reply, () => {
if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
aiDiv.innerHTML = DOMPurify.sanitize(marked.parse(reply));
} else {
aiDiv.textContent = reply;
}
this.scrollToBottom();
textarea.disabled = false;
textarea.focus();
this.saveMessage("ai", reply);
this.updateChatList();
});

} catch (err) {
aiDiv.className = "message error";
aiDiv.textContent = "Error talking to AI.";
console.error(err);
textarea.disabled = false;
textarea.focus();
this.saveMessage("error", "Error talking to AI.");
}
}

clearAllChats() {
if (!this.checkCookies()) return;

if (confirm('Are you sure you want to delete all chats? This cannot be undone.')) {
this.safeStorage().removeItem(this.CHATS_KEY);
this.safeStorage().removeItem(this.CURRENT_KEY);
this.allChats = {};
this.currentChatId = null;
this.startNewChat();
this.updateChatList();
}
}

initializeChats() {
const manager = window.getCookieManager();
if (manager?.canUseCookies()) {
this.loadAllChats();
this.updateChatList();
} else if (manager?.canUseCookies() === false) {
console.log('Cookies declined - chat functionality disabled');
} else {
setTimeout(() => this.initializeChats(), 100);
}
}
}

function showCookieConsent() {
const popup = document.getElementById('cookie-consent');
const notice = document.getElementById('cookie-notice');
popup?.classList.add('show');
notice?.classList.remove('show');
}

function toggleSidebar() {
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggle-btn');
const body = document.body;

if (!sidebar || !toggleBtn || !body) return;

sidebar.classList.toggle('close');
toggleBtn.classList.toggle('rotated');
body.style.gridTemplateColumns = sidebar.classList.contains('close') ? '60px 1fr' : '250px 1fr';

setTimeout(() => {
['chat', 'placeholder-container'].forEach(id => {
const el = document.getElementById(id);
if (el) {
el.style.width = '';
el.offsetWidth;
}
});
window.dispatchEvent(new Event('resize'));
}, 100);
}

let cookieManager, chatSystem;

document.addEventListener('DOMContentLoaded', () => {
cookieManager = new CookieManager();
chatSystem = new ChatSystem();
window.cookieManager = cookieManager;
window.chatSystem = chatSystem;
window.clearAllChats = () => chatSystem.clearAllChats();

document.getElementById('signin-btn')?.addEventListener('click', e => {
if (!cookieManager.canUseCookies()) {
e.preventDefault();
cookieManager.showCookieNotice();
return;
}
window.location.href = 'signin.html';
});
});

window.getCookieManager = () => window.cookieManager || cookieManager;