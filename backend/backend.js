document.addEventListener("DOMContentLoaded", () => {
    const textarea = document.getElementById("input");
    const chat = document.getElementById("chat");
    const sendBtn = document.getElementById("send");
    const STORAGE_KEY = "flicker_chat_messages";

    // Load saved chats from localStorage
    function loadChat() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;

        try {
            const messages = JSON.parse(saved);
            messages.forEach(({ sender, text }) => {
                const div = document.createElement("div");
                div.className = "message " + sender;
                // We won't replay typeEffect for performance, just add text sanitized
                div.innerHTML = DOMPurify.sanitize(marked.parse(text));
                chat.appendChild(div);
            });
            scrollChatToBottom();
        } catch (e) {
            console.warn("Failed to load chat from storage", e);
        }
    }

    // Save all messages currently in chat to localStorage
    function saveChat() {
        const messages = [];
        chat.querySelectorAll(".message").forEach(div => {
            // Save sender and raw text (strip HTML)
            const sender = div.classList.contains("user") ? "user" : 
                           div.classList.contains("ai") ? "ai" : "unknown";
            const text = div.textContent || "";
            messages.push({ sender, text });
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }

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
            sendBtn.click();
        }
    });

    function scrollChatToBottom() {
        chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
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
                callback();
            }
        }
        type();
    }

    sendBtn.addEventListener("click", async () => {
        const userMessage = textarea.value.trim();
        if (!userMessage) return;

        const placeholder = document.getElementById("placeholder-container");
        if (placeholder) placeholder.style.display = "none";

        const headerContainer = document.getElementById("header-container");
        if (headerContainer) {
            headerContainer.style.display = "none";
        } else {
            const h1 = document.querySelector("main h1");
            const subtitle = document.getElementById("subtitle");
            const h3s = document.querySelectorAll("main > h3");
            if (h1) h1.style.display = "none";
            if (subtitle) subtitle.style.display = "none";
            if (h3s.length > 1) h3s[1].style.display = "none";
        }

        // User message
        const userDiv = document.createElement("div");
        userDiv.className = "message user";
        userDiv.textContent = userMessage;
        chat.appendChild(userDiv);
        scrollChatToBottom();

        textarea.value = "";
        textarea.style.height = "auto";

        // AI typing placeholder
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
                aiDiv.innerHTML = DOMPurify.sanitize(marked.parse(reply));
                scrollChatToBottom();
                textarea.disabled = false;
                textarea.focus();

                // Save chat to localStorage after AI reply finishes typing
                saveChat();
            });

            // Save chat after user message added
            saveChat();

        } catch (err) {
            aiDiv.className = "message error";
            aiDiv.textContent = "Error talking to AI.";
            console.error(err);
            textarea.disabled = false;
            textarea.focus();

            // Save chat even on error (user message present)
            saveChat();
        }
    });

    // Load chat on page load
    loadChat();
});
