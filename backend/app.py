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

@app.route("/", methods=["POST"])
def chat():
    try:
        data = request.get_json(force=True)
        message = data.get("message")

        if not message:
            return jsonify({"error": "No message provided"}), 400

        # Start a new chat
        convo = model.start_chat(history=[])
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
