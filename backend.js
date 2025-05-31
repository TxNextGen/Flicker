document.addEventListener("DOMContentLoaded", () => {
    const textarea = document.getElementById("input");
    const chat = document.getElementById("chat");
    const sendBtn = document.getElementById("send");

    // Auto-grow up to 8 lines
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

    // Enter to send, Shift+Enter for newline
    textarea.addEventListener("keydown", function(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });

    // Send message handler
    sendBtn.addEventListener("click", async () => {
        const userMessage = textarea.value.trim();
        if (!userMessage) return;

        // Hide placeholders on first message
        const placeholder = document.getElementById("placeholder-container");
        if (placeholder) {
            placeholder.style.display = "none";
        }

        // Show user message
        const userDiv = document.createElement("div");
        userDiv.className = "message user";
        userDiv.textContent = userMessage;
        chat.appendChild(userDiv);

        textarea.value = "";
        textarea.style.height = "auto";
        textarea.disabled = true;

        // Send to backend
        try {
            const res = await fetch("http://localhost:5000/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMessage })
            });

            const data = await res.json();

            const aiDiv = document.createElement("div");
            aiDiv.className = "message ai";
            aiDiv.textContent = data.reply || data.error || "No response";
            chat.appendChild(aiDiv);
        } catch (err) {
            const errorDiv = document.createElement("div");
            errorDiv.className = "message error";
            errorDiv.textContent = "Error talking to AI.";
            chat.appendChild(errorDiv);
            console.error(err);
        }

        textarea.disabled = false;
        textarea.focus();
    });
});
