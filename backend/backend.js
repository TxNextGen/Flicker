// The chats saves Now Vander now no need to Cry No more 

document.getElementById('signin-btn').addEventListener('click', () => {
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


function loadAllChats() {
try {
const stored = localStorage.getItem(CHATS_STORAGE_KEY);
if (stored) {
allChats = JSON.parse(stored);
}

const lastChatId = localStorage.getItem(CURRENT_CHAT_KEY);
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
localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(allChats));
if (currentChatId) {
localStorage.setItem(CURRENT_CHAT_KEY, currentChatId);
}
console.log('Chats saved to localStorage:', allChats);
} catch (error) {
console.error('Error saving chats:', error);
}
}


function generateChatId() {
return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}


function createNewChat(firstMessage = null) {
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
localStorage.setItem(CURRENT_CHAT_KEY, chatId);
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
localStorage.removeItem(CURRENT_CHAT_KEY);
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


addChatBtn.addEventListener("click", startNewChat);


chatList.addEventListener("click", (e) => {
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
textarea.addEventListener("input", function () {
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
sendBtn.addEventListener("click", async () => {
const userMessage = textarea.value.trim();
if (!userMessage) return;


if (!currentChatId) {
createNewChat(userMessage);
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
const res = await fetch("https://flickerbackend.onrender.com/", {
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
if (confirm('Are you sure you want to delete all chats? This cannot be undone.')) {
localStorage.removeItem(CHATS_STORAGE_KEY);
localStorage.removeItem(CURRENT_CHAT_KEY);
allChats = {};
currentChatId = null;
startNewChat();
updateChatList();
console.log('All chats cleared');
}
}


window.clearAllChats = clearAllChats;
loadAllChats();
updateChatList();
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