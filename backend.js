document.addEventListener("DOMContentLoaded", () => {
    const textarea = document.getElementById("input");
    const chat = document.getElementById("chat");
    const sendBtn = document.getElementById("send");

    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight, 10);
    const maxLines = 8;
    const maxHeight = lineHeight * maxLines;

    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.overflowY = 'hidden';

      const newHeight = textarea.scrollHeight;
      if (newHeight <= maxHeight) {
        textarea.style.height = newHeight + 'px';
      } else {
        textarea.style.height = maxHeight + 'px';
        textarea.style.overflowY = 'auto';
      }
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
      }
    });

    // Send message
    sendBtn.addEventListener("click", async () => {
        const userMessage = textarea.value.trim();
        if (!userMessage) return;

        // Show user message
        const userDiv = document.createElement("div");
        userDiv.className = "message user";
        userDiv.textContent = userMessage;
        chat.appendChild(userDiv);

        textarea.value = "";
        textarea.style.height = "auto"; // reset height
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
