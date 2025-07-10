from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import time
import os
import base64
from PIL import Image
import io
import config

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

SYSTEM_PROMPT = """You are a smart and friendly AI assistant. Be helpful, clear, and engaging. 
Match the user's tone. Ask kind follow-up questions when they greet you, like "How's your day going?" 
When analyzing images, be detailed and helpful in your descriptions."""

def process_image(image_data):
    """Process base64 image data for OpenRouter API"""
    try:
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=85)
        buffer.seek(0)
        

        encoded_image = base64.b64encode(buffer.getvalue()).decode('utf-8')
        return f"data:image/jpeg;base64,{encoded_image}"
        
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


        messages = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]
        
        if image_data:

            processed_image = process_image(image_data)
            if not processed_image:
                return jsonify({"error": "Failed to process image"}), 400
            
            user_content = []
            if message:
                user_content.append({"type": "text", "text": message})
            user_content.append({"type": "image_url", "image_url": {"url": processed_image}})
            
            messages.append({"role": "user", "content": user_content})
        else:

            messages.append({"role": "user", "content": message})
        
     
        headers = {
            "Authorization": f"Bearer {config.API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5000",  
            "X-Title": "Flask OpenRouter App"  
        }
        
        payload = {
            "model": config.MODEL_NAME,
            "messages": messages,
            "max_tokens": config.GENERATION_CONFIG.get("max_tokens", 1000),
            "temperature": config.GENERATION_CONFIG.get("temperature", 0.7),
            "top_p": config.GENERATION_CONFIG.get("top_p", 0.9),
            "frequency_penalty": config.GENERATION_CONFIG.get("frequency_penalty", 0.0),
            "presence_penalty": config.GENERATION_CONFIG.get("presence_penalty", 0.0)
        }
        
        start_time = time.time()
        

        response = requests.post(
            f"{config.API_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        duration = time.time() - start_time
        print(f"OpenRouter API response time: {duration:.2f} seconds")
        
        if response.status_code != 200:
            print(f"OpenRouter API error: {response.status_code} - {response.text}")
            return jsonify({"error": f"OpenRouter API error: {response.status_code}"}), 500
        
        result = response.json()
        
        if 'choices' not in result or not result['choices']:
            return jsonify({"error": "No response from OpenRouter API"}), 500
        
        reply = result['choices'][0]['message']['content'].strip()
        
        return jsonify({"reply": reply})
        
    except requests.exceptions.RequestException as e:
        print(f"Request error: {str(e)}")
        return jsonify({"error": f"Request error: {str(e)}"}), 500
    except Exception as e:
        print(f"Server error: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/", methods=["GET"])
def hello():
    return "✅ Flask API is running (OpenRouter with Image Support). Use POST to send messages.", 200

@app.route("/models", methods=["GET"])
def get_models():
    """Get available models from OpenRouter"""
    try:
        headers = {
            "Authorization": f"Bearer {config.API_KEY}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(
            f"{config.API_BASE_URL}/models",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({"error": "Failed to fetch models"}), 500
            
    except Exception as e:
        return jsonify({"error": f"Error fetching models: {str(e)}"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
 
    app.run(host="0.0.0.0", port=port, debug=False)