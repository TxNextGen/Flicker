
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
const restrictedElements = ['#signin-btn', '#add-chat-btn', '#send', '#input', '#image-upload-btn'];
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
const imageUploadBtn = document.getElementById('image-upload-btn');

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
if (imageUploadBtn) {
imageUploadBtn.disabled = false;
imageUploadBtn.style.opacity = '1';
imageUploadBtn.style.cursor = 'pointer';
}
}

disableChatFeatures() {
const textarea = document.getElementById('input');
const sendBtn = document.getElementById('send');
const addChatBtn = document.getElementById('add-chat-btn');
const imageUploadBtn = document.getElementById('image-upload-btn');

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
if (imageUploadBtn) {
imageUploadBtn.disabled = true;
imageUploadBtn.style.opacity = '0.5';
imageUploadBtn.style.cursor = 'not-allowed';
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

document.addEventListener('DOMContentLoaded', () => {
const signinBtn = document.getElementById('signin-btn');
if (signinBtn) {
signinBtn.addEventListener('click', (e) => {
if (!window.getCookieManager()?.canUseCookies()) {
e.preventDefault();
window.getCookieManager()?.showCookieNotice();
return;
}
window.location.href = 'signin.html';
});
}
});

let selectedImage = null;
let selectedImageName = '';
let currentRenamingChatId = null;

document.addEventListener("DOMContentLoaded", () => {
const textarea = document.getElementById("input");
const chat = document.getElementById("chat");
const sendBtn = document.getElementById("send");
const addChatBtn = document.getElementById("add-chat-btn");
const chatList = document.getElementById("chat-list");

const imageUploadBtn = document.getElementById('image-upload-btn');
const imageInput = document.getElementById('image-input');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');

const CHATS_STORAGE_KEY = "flicker_all_chats";
const CURRENT_CHAT_KEY = "flicker_current_chat";
let currentChatId = null;
let allChats = {};


createRenamePopup();

if (imageUploadBtn && imageInput) {
console.log('Image upload elements found, initializing...');

imageUploadBtn.addEventListener('click', (e) => {
console.log('Image upload button clicked');
if (!window.getCookieManager()?.canUseCookies()) {
e.preventDefault();
window.getCookieManager()?.showCookieNotice();
return;
}
imageInput.click();
});

imageInput.addEventListener('change', handleImageSelect);
} else {
console.error('Image upload elements not found!');
}

if (removeImageBtn) {
removeImageBtn.addEventListener('click', clearSelectedImage);
}

function createRenamePopup() {
if (document.getElementById('rename-popup')) return;

const popupHTML = `
<div id="rename-popup" class="popup-overlay">
<div class="popup-content">
<h3>Rename Chat</h3>
<input type="text" id="rename-input" placeholder="Enter new chat name">
<div class="popup-buttons">
<button id="cancel-rename" class="popup-btn cancel-btn">Cancel</button>
<button id="save-rename" class="popup-btn save-btn">Save</button>
</div>
</div>
</div>
`;

document.body.insertAdjacentHTML('beforeend', popupHTML);
const renamePopup = document.getElementById('rename-popup');
const renameInput = document.getElementById('rename-input');
const saveRenameBtn = document.getElementById('save-rename');
const cancelRenameBtn = document.getElementById('cancel-rename');

if (saveRenameBtn) {
saveRenameBtn.addEventListener('click', saveRename);
}

if (cancelRenameBtn) {
cancelRenameBtn.addEventListener('click', cancelRename);
}

if (renameInput) {
renameInput.addEventListener('keydown', (e) => {
if (e.key === 'Enter') {
saveRename();
} else if (e.key === 'Escape') {
cancelRename();
}
});
}

if (renamePopup) {
renamePopup.addEventListener('click', (e) => {
if (e.target === renamePopup) {
cancelRename();
}
});
}
}

function handleImageSelect(event) {
console.log('Image selected');
const file = event.target.files[0];
if (!file) return;

const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
if (!validTypes.includes(file.type)) {
alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
return;
}

const maxSize = 5 * 1024 * 1024;
if (file.size > maxSize) {
alert('Image size must be less than 5MB');
return;
}

const reader = new FileReader();
reader.onload = function(e) {
selectedImage = e.target.result;
selectedImageName = file.name;
console.log('Image loaded:', selectedImageName);
showImagePreview(selectedImage, selectedImageName);

const input = document.getElementById('input');
const uploadBtn = document.getElementById('image-upload-btn');
if (input) input.classList.add('with-image');
if (uploadBtn) uploadBtn.style.background = 'rgba(74, 158, 255, 0.2)';
};
reader.readAsDataURL(file);
}

function showImagePreview(imageSrc, fileName) {
if (!imagePreview) {
console.error('Image preview element not found');
return;
}

const previewImg = imagePreview.querySelector('img');
const previewName = imagePreview.querySelector('.image-preview-name');

if (previewImg) previewImg.src = imageSrc;
if (previewName) previewName.textContent = fileName;

imagePreview.classList.add('show');
console.log('Image preview shown');
}

function clearSelectedImage() {
selectedImage = null;
selectedImageName = '';

if (imageInput) imageInput.value = '';
if (imagePreview) imagePreview.classList.remove('show');

const input = document.getElementById('input');
const uploadBtn = document.getElementById('image-upload-btn');
if (input) input.classList.remove('with-image');
if (uploadBtn) uploadBtn.style.background = 'transparent';

console.log('Selected image cleared');
}

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


function createChatMenuHTML() {
return `
<button class="chat-menu-btn" type="button">
<img src="images/dots.png" alt="Menu" class="menu-icon">
</button>
<div class="chat-menu">
<button class="menu-option rename-option" type="button">Rename Chat</button>
<button class="menu-option delete-option" type="button">Delete</button>
</div>
`;
}


function updateChatList() {
if (!chatList) return;

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
li.setAttribute('data-chat-id', chatId);

if (chatId === currentChatId) {
li.classList.add('active');
}

li.innerHTML = `
<button class="chat-button" data-chat-id="${chatId}" type="button">
<span class="chat-title">${chatData.title}</span>
</button>
${createChatMenuHTML()}
`;

chatList.appendChild(li);


bindChatItemEvents(li, chatId, chatData);
});
}


function bindChatItemEvents(chatItem, chatId, chatData) {
const chatButton = chatItem.querySelector('.chat-button');
const menuBtn = chatItem.querySelector('.chat-menu-btn');
const menu = chatItem.querySelector('.chat-menu');
const renameOption = chatItem.querySelector('.rename-option');
const deleteOption = chatItem.querySelector('.delete-option');


if (chatButton) {
chatButton.addEventListener('click', (e) => {
e.preventDefault();
e.stopPropagation();

if (!window.getCookieManager()?.canUseCookies()) {
window.getCookieManager()?.showCookieNotice();
return;
}

switchToChat(chatId);
});
}


if (menuBtn && menu) {
menuBtn.addEventListener('click', (e) => {
e.preventDefault();
e.stopPropagation();

console.log('Menu button clicked!', chatId);


document.querySelectorAll('.chat-menu.show').forEach(m => {
if (m !== menu) {
m.classList.remove('show');
}
});


menu.classList.toggle('show');

console.log('Menu should now be visible:', menu.classList.contains('show'));
});
}


if (renameOption) {
renameOption.addEventListener('click', (e) => {
e.preventDefault();
e.stopPropagation();
closeAllMenus();
openRenamePopup(chatId, chatData.title);
});
}


if (deleteOption) {
deleteOption.addEventListener('click', (e) => {
e.preventDefault();
e.stopPropagation();
closeAllMenus();
deleteChat(chatId);
});
}
}


function closeAllMenus() {
document.querySelectorAll('.chat-menu').forEach(menu => {
menu.classList.remove('show');
});
}


document.addEventListener('DOMContentLoaded', function() {
document.addEventListener('click', (e) => {
if (!e.target.closest('.chat-menu-btn') && !e.target.closest('.chat-menu')) {
closeAllMenus();
}
});
});


function testMenus() {
const menus = document.querySelectorAll('.chat-menu');
const buttons = document.querySelectorAll('.chat-menu-btn');
console.log('Found', menus.length, 'menus and', buttons.length, 'menu buttons');

buttons.forEach((btn, index) => {
console.log('Button', index, ':', btn);
btn.style.border = '2px solid red'; 
});

menus.forEach((menu, index) => {
console.log('Menu', index, ':', menu);
menu.style.border = '2px solid blue'; 
});
}

function debugMenuClick(chatId) {
console.log('Debug: Menu clicked for chat:', chatId);
const menu = document.querySelector(`[data-chat-id="${chatId}"] .chat-menu`);
if (menu) {
console.log('Menu element found:', menu);
console.log('Menu classes:', menu.className);
menu.classList.add('show');
console.log('Added show class, new classes:', menu.className);
} else {
console.log('Menu element NOT found for chat:', chatId);
}
}


function openRenamePopup(chatId, currentTitle) {
currentRenamingChatId = chatId;
const renameInput = document.getElementById('rename-input');
const renamePopup = document.getElementById('rename-popup');

if (renameInput) {
renameInput.value = currentTitle;
}
if (renamePopup) {
renamePopup.classList.add('show');
}
if (renameInput) {
setTimeout(() => {
renameInput.focus();
renameInput.select();
}, 100);
}
}

function saveRename() {
const renameInput = document.getElementById('rename-input');
if (!currentRenamingChatId || !renameInput) return;

const newTitle = renameInput.value.trim();
if (!newTitle) return;

if (allChats[currentRenamingChatId]) {
allChats[currentRenamingChatId].title = newTitle;
saveAllChats();
updateChatList();
}

cancelRename();
}

function cancelRename() {
currentRenamingChatId = null;
const renamePopup = document.getElementById('rename-popup');
const renameInput = document.getElementById('rename-input');

if (renamePopup) {
renamePopup.classList.remove('show');
}
if (renameInput) {
renameInput.value = '';
}
}

function deleteChat(chatId) {
if (!chatId || !allChats[chatId]) return;

if (confirm('Are you sure you want to delete this chat? This cannot be undone.')) {
delete allChats[chatId];
saveAllChats();
updateChatList();

if (chatId === currentChatId) {
startNewChat();
}
}
}

function updateChatListSelection() {
const chatItems = chatList.querySelectorAll('.chat-item');
chatItems.forEach(item => {
const chatId = item.getAttribute('data-chat-id');
if (chatId === currentChatId) {
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


document.addEventListener('click', (e) => {
if (!e.target.closest('.chat-menu-btn') && !e.target.closest('.chat-menu')) {
closeAllMenus();
}
});


chatList.addEventListener('click', (e) => {
if (e.target.closest('.chat-menu') || e.target.closest('.chat-menu-btn')) {
e.stopPropagation();
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

if (!userMessage && !selectedImage) return;

if (!currentChatId) {
const newChatId = createNewChat(userMessage || "Image");
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

if (selectedImage) {
const imgElement = document.createElement("img");
imgElement.src = selectedImage;
imgElement.style.maxWidth = "300px";
imgElement.style.maxHeight = "200px";
imgElement.style.borderRadius = "8px";
imgElement.style.marginBottom = "8px";
imgElement.style.display = "block";
userDiv.appendChild(imgElement);
}

if (userMessage) {
const textElement = document.createElement("div");
textElement.textContent = userMessage;
userDiv.appendChild(textElement);
}

chat.appendChild(userDiv);
scrollChatToBottom();

saveMessageToCurrentChat("user", userMessage || "Image shared");

textarea.value = "";
textarea.style.height = "auto";
const tempImage = selectedImage;
clearSelectedImage();

const aiDiv = document.createElement("div");
aiDiv.className = "message ai";
aiDiv.textContent = "Flicker AI is Typing...";
chat.appendChild(aiDiv);
scrollChatToBottom();

textarea.disabled = true;

try {
const requestBody = {
message: userMessage || "What do you see in this image?"
};

if (tempImage) {
requestBody.image = tempImage;
}

console.log('Sending request with image:', !!tempImage);

const res = await fetch("https://flickerbackend3.onrender.com", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify(requestBody)
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