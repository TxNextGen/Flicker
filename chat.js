const chatDiv = document.getElementById("chat");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");

function addMessage(sender, text, cssClass) {
  const div = document.createElement("div");
  div.className = cssClass;
  div.textContent = `${sender}: ${text}`;
  chatDiv.appendChild(div);
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

async function sendMessage() {
  const message = input.value.trim();
  if (!message) return;

  addMessage("You", message, "user");
  input.value = "";
  input.disabled = true;
  sendBtn.disabled = true;

  try {
    const response = await fetch("https://flicker-i6x7.onrender.com", {  
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.reply) {
      addMessage("Bot", data.reply, "bot");
    } else {
      addMessage("Bot", "Error: " + (data.error || "No response"), "bot");
    }
  } catch (error) {
    addMessage("Bot", "Network error: " + error.message, "bot");
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
