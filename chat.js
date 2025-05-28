const chatDiv = document.getElementById("chat");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
const placeholder = document.getElementById("placeholder-message");

function addMessage(text, cssClass) {
    const div = document.createElement("div");
    div.className = cssClass;
    div.textContent = text;
    chatDiv.appendChild(div);
    div.scrollIntoView({ behavior: "smooth" });
}


function removePlaceholder() {
    if (placeholder) {
        placeholder.style.transition = "opacity 0.8s ease-out, transform 0.8s ease-out";
        placeholder.style.opacity = "0";
        placeholder.style.transform = "translateY(-20px)";

        setTimeout(() => placeholder.remove(), 850);
    }
}

async function sendMessage() {
    const message = input.value.trim();
    if (!message) return;

    removePlaceholder();

    setTimeout(() => {
        addMessage(message, "user"); 
        input.value = "";
        input.disabled = true;
        sendBtn.disabled = true;

        fetchBackendMessage(message);
    }, 850); 
}

async function fetchBackendMessage(message) {
    try {
        const response = await fetch("https://YOUR_BACKEND_URL/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        setTimeout(() => {
            if (data.reply) {
                addMessage(data.reply, "bot");
            } else {
                addMessage("Error: " + (data.error || "No response"), "bot");
            }
        }, 300);
    } catch (error) {
        addMessage("Network error: " + error.message, "bot");
    } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }
}


sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage(); 
});

input.focus();
