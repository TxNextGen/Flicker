from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  

openai.api_key = os.getenv("OPENAI_API_KEY")

if not openai.api_key:
    print("⚠️ Warning: OPENAI_API_KEY environment variable not set!")

@app.route("/", methods=["POST"])
def chat():
    try:
        data = request.get_json(force=True)
        message = data.get("message")

        if not message:
            return jsonify({"error": "No message provided"}), 400

    
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": message}],
            timeout=15
        )

        reply = response.choices[0].message.content.strip()
        return jsonify({"reply": reply})

    except openai.error.OpenAIError as e:
        return jsonify({"error": f"OpenAI API error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/", methods=["GET"])
def hello():
    return "✅ Flask API is running. Use POST to send messages.", 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
