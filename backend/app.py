from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import time
import os
import base64
from PIL import Image
import io


import config

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


genai.configure(api_key=config.API_KEY)


model = genai.GenerativeModel(model_name=config.MODEL_NAME)


SYSTEM_PROMPT = """
You are Flicker AI, a smart and friendly assistant. Be helpful, clear, and engaging.
Keep answers short—1 sentence is best, 2 if needed. Match the user's tone.
Ask kind follow-up questions when they greet you, like "How's your day going?"
When analyzing images, be detailed and helpful in your descriptions.
"""

def process_image(image_data):
"""Process base64 image data for Gemini API""" 
try:

if ',' in image_data:
image_data = image_data.split(',')[1]


image_bytes = base64.b64decode(image_data)


image = Image.open(io.BytesIO(image_bytes))


if image.mode != 'RGB':
image = image.convert('RGB')


buffer = io.BytesIO()
image.save(buffer, format='JPEG')
buffer.seek(0)

return {
'mime_type': 'image/jpeg',
'data': buffer.getvalue()
}
except Exception as e:
print(f"Error processing image: {str(e)}")
return None

@app.route("/", methods=["POST"])
def chat():
try:
data = request.get_json(force=True)
message = data.get("message")
image_data = data.get("image")

if not message and not image_data:
return jsonify({"error": "No message or image provided"}), 400


content_parts = []


if message:
content_parts.append(message)


if image_data:
processed_image = process_image(image_data)
if processed_image:
content_parts.append(processed_image)
else:
return jsonify({"error": "Failed to process image"}), 400


start_time = time.time()


response = model.generate_content(
content_parts,
system_instruction=SYSTEM_PROMPT
)

duration = time.time() - start_time
print(f"Gemini API response time: {duration:.2f} seconds")

reply = response.text.strip()
return jsonify({"reply": reply})

except Exception as e:
print(f"Server error: {str(e)}")
return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/", methods=["GET"])
def hello():
return "✅ Flask API is running (Gemini with Image Support). Use POST to send messages.", 200

if __name__ == "__main__":
port = int(os.environ.get("PORT", 5000))
app.run(host="0.0.0.0", port=port)