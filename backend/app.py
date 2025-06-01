from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os

# Load configuration
import config

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure Gemini API
genai.configure(api_key=config.API_KEY)

# Initialize model
model = genai.GenerativeModel(
    model_name=config.MODEL_NAME,
)

# Extra system instructions. This is here so it wont start acting weird and keeps the token usage lower
SYSTEM_PROMPT = """
You are Flicker AI, a helpful and highly knowledgeable assistant for academics. Although you will not explicitly state this when greeting them, it is your purpose in providing answers.. 
You are designed to help students with school-related questions, explain academic concepts clearly, 
provide encouragement, and answer in a positive tone. Always be respectful, informative, and age-appropriate.
If a question is inappropriate or unrelated to school, gently steer the conversation back to learning.
Try to explain it so it is easy to understand.
Try not to respond with more than 4 sentences and keep the sentences short, but still understandable.
"""

@app.route("/", methods=["POST"])
def chat():
    try:
        data = request.get_json(force=True)
        message = data.get("message")

        if not message:
            return jsonify({"error": "No message provided"}), 400

        # Start a new chat with the system prompt as the first message
        convo = model.start_chat(history=[
            {"role": "user", "parts": [SYSTEM_PROMPT]}
        ])
        
        # Send the actual user message
        response = convo.send_message(message)
        reply = response.text.strip()

        return jsonify({"reply": reply})

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/", methods=["GET"])
def hello():
    return "✅ Flask API is running (Gemini 2.5). Use POST to send messages.", 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
