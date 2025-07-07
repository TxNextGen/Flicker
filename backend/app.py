from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import time
import os
import base64
from PIL import Image
import io
import json
import hashlib
import config
import re

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

genai.configure(api_key=config.API_KEY)
model = genai.GenerativeModel(
    model_name=config.MODEL_NAME,
    generation_config=config.GENERATION_CONFIG,
    safety_settings=config.SAFETY_SETTINGS
)

USAGE_FILE = "usage.json"


PROFANITY_WORDS = [

    'fuck', 'shit', 'bitch', 'damn', 'hell', 'ass', 'crap', 'piss',
    'bastard', 'whore', 'slut', 'cunt', 'cock', 'dick', 'pussy',
    'tits', 'boobs', 'motherfucker', 'asshole', 'bullshit', 'goddamn',
    'dumbass', 'jackass', 'dipshit', 'shithead', 'fuckface', 'dickhead',
    'prick', 'twat', 'fag', 'faggot', 'nigger', 'retard', 'spic',
    'chink', 'gook', 'wetback', 'kike', 'towelhead', 'raghead',
    
   
    'f*ck', 'sh*t', 'b*tch', 'f***', 's***', 'b***', 'a$$', 'a**',
    'fck', 'shxt', 'btch', 'fuk', 'sht', 'fook', 'phuck', 'phuk',
    'biatch', 'beotch', 'beyotch', 'shiznit', 'azz', 'arse', 'arsehole',
    'phuq', 'phuck', 'sheeit', 'shiit', 'shiet', 'dafuq', 'wtf',
    'stfu', 'gtfo', 'omfg', 'jfc', 'pos', 'sob', 'mofo', 'mf',
    

    'f u c k', 'f-u-c-k', 'f.u.c.k', 's h i t', 's-h-i-t', 's.h.i.t',
    'f**k', 's**t', 'b**ch', 'a**hole', 'd**n', 'h**l', 'cr*p',
    'p*ss', 'b*st*rd', 'wh*re', 'sl*t', 'c*nt', 'c*ck', 'd*ck',
    'p*ssy', 't*ts', 'b**bs', 'motherf*cker', 'bullsh*t', 'godd*mn',
    'dumb*ss', 'jack*ss', 'dipsh*t', 'sh*thead', 'f*ckface',
    'd*ckhead', 'pr*ck', 'tw*t'
]

def contains_profanity(text):
    """Check if text contains profanity"""
    if not text:
        return False
    
   
    text_lower = text.lower()
    

    normalized_text = re.sub(r'[^a-zA-Z0-9\s]', '', text_lower)
    

    for word in PROFANITY_WORDS:
        if word in text_lower:
            return True
    

    spaced_text = re.sub(r'\s+', '', normalized_text)
    for word in PROFANITY_WORDS:
        if word.replace(' ', '') in spaced_text:
            return True
    
  
    words = normalized_text.split()
    for word in words:
        if word in PROFANITY_WORDS:
            return True
    
    return False

def load_usage():
    """Load usage data from file"""
    try:
        if os.path.exists(USAGE_FILE):
            with open(USAGE_FILE, 'r') as f:
                return json.load(f)
        return {}
    except:
        return {}

def save_usage(usage_data):
    """Save usage data to file"""
    try:
        with open(USAGE_FILE, 'w') as f:
            json.dump(usage_data, f)
    except:
        pass

def get_user_id(request):
    """Generate user ID from IP and user agent"""
    ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
    user_agent = request.headers.get('User-Agent', '')
    return hashlib.md5(f"{ip}:{user_agent}".encode()).hexdigest()

def check_usage_limit(user_id):
    """Check if user has exceeded usage limit"""
    usage_data = load_usage()
    user_usage = usage_data.get(user_id, 0)
    return user_usage < config.USAGE_LIMIT

def increment_usage(user_id):
    """Increment user usage count"""
    usage_data = load_usage()
    usage_data[user_id] = usage_data.get(user_id, 0) + 1
    save_usage(usage_data)
    return usage_data[user_id]

SYSTEM_PROMPT = """You are Flicker AI, an advanced AI assistant. You're knowledgeable, capable, and helpful across all topics - coding, math, science, creative tasks, analysis, problem-solving, and more.

Key traits:
- Expert-level knowledge in all fields
- Excellent at reasoning and problem-solving
- Creative and analytical
- Understands context and nuance
- Adapts to any task or question

Response style:
- Keep answers concise and direct
- Be conversational and friendly
- Only elaborate if asked for details
- Match the user's tone and energy

You can handle anything thrown at you - just keep it brief and smart."""

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
        user_id = get_user_id(request)
        if not check_usage_limit(user_id):
            usage_data = load_usage()
            current_usage = usage_data.get(user_id, 0)
            return jsonify({
                "error": f"Usage limit exceeded. You have used {current_usage}/{config.USAGE_LIMIT} questions.",
                "usage_limit_reached": True
            }), 429
        
        data = request.get_json(force=True)
        message = data.get("message")
        image_data = data.get("image")
        
        if not message and not image_data:
            return jsonify({"error": "No message or image provided"}), 400
        
  
        if message and contains_profanity(message):
            return jsonify({
                "error": "I Understand If your frustrated. But try to keep the conversation respectful.",
                "profanity_detected": True
            }), 400
        
        new_usage_count = increment_usage(user_id)
        
        content_parts = []
        
        if message:
            full_message = f"{SYSTEM_PROMPT}\n\nUser: {message}"
            content_parts.append(full_message)
        else:
            content_parts.append(SYSTEM_PROMPT)
        
        if image_data:
            processed_image = process_image(image_data)
            if processed_image:
                content_parts.append(processed_image)
            else:
                return jsonify({"error": "Failed to process image"}), 400
        
        start_time = time.time()
        response = model.generate_content(content_parts)
        duration = time.time() - start_time
        
        print(f"Gemini API response time: {duration:.2f} seconds")
        
        reply = response.text.strip()
        remaining_uses = config.USAGE_LIMIT - new_usage_count
        
        return jsonify({
            "reply": reply,
            "usage_info": {
                "used": new_usage_count,
                "remaining": remaining_uses,
                "limit": config.USAGE_LIMIT
            }
        })
        
    except Exception as e:
        print(f"Server error: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/usage", methods=["GET"])
def get_usage():
    """Get current usage statistics for the user"""
    user_id = get_user_id(request)
    usage_data = load_usage()
    current_usage = usage_data.get(user_id, 0)
    remaining_uses = config.USAGE_LIMIT - current_usage
    
    return jsonify({
        "used": current_usage,
        "remaining": remaining_uses,
        "limit": config.USAGE_LIMIT
    })

@app.route("/", methods=["GET"])
def hello():
    return "✅ Flicker AI is running (Gemini 2.5 Flash With Image Support). Use POST to send messages.", 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)