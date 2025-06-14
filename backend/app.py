from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import time
import os

# Load configuration
import config

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure Gemini API
genai.configure(api_key=config.API_KEY)

# Initialize model once
model = genai.GenerativeModel(model_name=config.MODEL_NAME)

# Optional system prompt to guide the assistant
SYSTEM_PROMPT = """
You are Flicker AI, a smart and friendly assistant. Be helpful, clear, and engaging. Keep answers short—1 sentence is best, 2 if needed. Match the user’s tone. Ask kind follow-up questions when they greet you, like “How’s your day going?”
"""

@app.route("/", methods=["POST"])
def chat():
    try:
        data = request.get_json(force=True)
        message = data.get("message")

        if not message:
            return jsonify({"error": "No message provided"}), 400

        # Measure Gemini API latency
        start_time = time.time()
        response = model.generate_content(
            message,
            system_instruction=SYSTEM_PROMPT
        )
        duration = time.time() - start_time
        print(f"Gemini API response time: {duration:.2f} seconds")

        reply = response.text.strip()
        return jsonify({"reply": reply})

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/", methods=["GET"])
def hello():
    return "✅ Flask API is running (Gemini). Use POST to send messages.", 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
