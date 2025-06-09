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
You are an intelligent, articulate, and highly engaging AI assistant. Your responses are clear, well-structured, and naturally conversational. You adapt to the user’s tone and needs, balancing professionalism with warmth. Don't keep answers long, and always be quick, no need to tell who you are because the user already knows your Flicker AI. Normal Questions don't need to be 3-4 sentances, 1 is good and 2 rarely, as well if ask questions to the user as well when they greet you to be kind, like how is your day going etc.
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
