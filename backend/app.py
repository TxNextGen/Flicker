from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from google import genai as imagen_client
from google.genai import types
import time
import os
import base64
from PIL import Image
import io
import json
from datetime import datetime, timedelta
import hashlib
import logging
from functools import wraps
import threading
from collections import defaultdict

import config

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format=config.LOG_FORMAT,
    handlers=[
        logging.FileHandler(config.LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


genai.configure(api_key=config.API_KEY)


imagen_client_instance = imagen_client.Client(api_key=config.API_KEY)

model = genai.GenerativeModel(
    model_name=config.MODEL_NAME,
    generation_config=config.GENERATION_CONFIG,
    safety_settings=config.SAFETY_SETTINGS
)

rate_limiter = defaultdict(list)
rate_lock = threading.Lock()

SYSTEM_PROMPT = """You are Flicker AI - an exceptionally intelligent, creative, and helpful assistant with advanced reasoning capabilities.

**Core Identity:**
- Brilliant problem-solver with deep analytical thinking
- Creative and innovative in your approaches
- Concise yet comprehensive in responses
- Genuinely helpful and engaging

**Communication Style:**
- Lead with insights, not pleasantries
- Use examples and analogies when they clarify
- Be conversational but purposeful
- Ask strategic follow-up questions that unlock deeper value

**Special Capabilities:**
- Image analysis with contextual understanding
- Code review and programming assistance
- Creative writing and ideation
- Complex problem decomposition
- Strategic thinking and planning

**Response Framework:**
1. Core answer with key insights
2. Supporting context when valuable
3. One strategic follow-up question (if beneficial)

**For Images:**
- Analyze thoroughly: content, context, implications
- Identify patterns, anomalies, and opportunities
- Provide actionable insights when relevant

**For Greetings:**
When someone says "hi" or similar, respond: "Hi! What's on your mind today?"

**For Image Generation Requests:**
If asked to create, generate, or make an image, respond with: "I can help you create an image! Please describe what you'd like me to generate."

Stay sharp, insightful, and genuinely useful. Think before you respond."""

def get_user_id(request):
    """Generate unique user ID based on IP and User-Agent"""
    user_ip = request.remote_addr
    user_agent = request.headers.get('User-Agent', '')
    user_string = f"{user_ip}:{user_agent}"
    return hashlib.md5(user_string.encode()).hexdigest()

def rate_limit_check(user_id):
    """Check if user is within rate limits"""
    with rate_lock:
        now = time.time()
        user_requests = rate_limiter[user_id]
        
        user_requests[:] = [req_time for req_time in user_requests if now - req_time < 60]
        
        if len(user_requests) >= config.RATE_LIMITING["requests_per_minute"]:
            return False, len(user_requests)
        
        user_requests.append(now)
        return True, len(user_requests)

def load_usage_data():
    """Load usage data from JSON file"""
    try:
        if os.path.exists(config.USAGE_FILE):
            with open(config.USAGE_FILE, 'r') as f:
                return json.load(f)
        return {}
    except Exception as e:
        logger.error(f"Error loading usage data: {e}")
        return {}

def save_usage_data(data):
    """Save usage data to JSON file"""
    try:
        with open(config.USAGE_FILE, 'w') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving usage data: {e}")

def should_reset_usage(last_reset_str):
    """Check if usage should be reset based on reset period"""
    try:
        last_reset = datetime.fromisoformat(last_reset_str)
        now = datetime.now()
        
        if config.USAGE_LIMITS["reset_period"] == "daily":
            return now.date() > last_reset.date()
        elif config.USAGE_LIMITS["reset_period"] == "weekly":
            return now.isocalendar()[1] > last_reset.isocalendar()[1]
        elif config.USAGE_LIMITS["reset_period"] == "monthly":
            return now.month > last_reset.month or now.year > last_reset.year
        
        return False
    except Exception as e:
        logger.error(f"Error checking reset time: {e}")
        return True

def check_usage_limit(user_id, limit_type="questions"):
    """Check and update usage limits"""
    usage_data = load_usage_data()
    
    if user_id not in usage_data:
        usage_data[user_id] = {
            "questions": 0,
            "image_generations": 0,
            "last_reset": datetime.now().isoformat()
        }
        save_usage_data(usage_data)
        return True, 0
    
    user_data = usage_data[user_id]

    if should_reset_usage(user_data["last_reset"]):
        user_data["questions"] = 0
        user_data["image_generations"] = 0
        user_data["last_reset"] = datetime.now().isoformat()
        save_usage_data(usage_data)
    
    current_count = user_data.get(limit_type, 0)
    
    if limit_type == "questions":
        max_limit = config.USAGE_LIMITS["max_questions_per_user"]
    else:
        max_limit = config.USAGE_LIMITS["max_image_generations_per_user"]
    
    if current_count >= max_limit:
        return False, current_count
    
    return True, current_count

def increment_usage(user_id, usage_type="questions"):
    """Increment usage counter"""
    usage_data = load_usage_data()
    
    if user_id in usage_data:
        usage_data[user_id][usage_type] = usage_data[user_id].get(usage_type, 0) + 1
        save_usage_data(usage_data)

def process_image(image_data):
    """Process and validate image data"""
    try:
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        
        if len(image_bytes) > 10 * 1024 * 1024:
            return None, "Image too large. Maximum size is 10MB."
        
        image = Image.open(io.BytesIO(image_bytes))
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        max_size = (2048, 2048)
        if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=85)
        buffer.seek(0)
        
        return {
            'mime_type': 'image/jpeg',
            'data': buffer.getvalue()
        }, None
        
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        return None, str(e)

def detect_image_generation_request(message):
    """Detect if user is requesting image generation"""
    if not message:
        return False
    
    generation_keywords = [
        "create image", "generate image", "make image", "draw", "create picture",
        "generate picture", "make picture", "show me", "create a", "generate a",
        "make a", "design", "illustrate", "visualize", "paint", "sketch"
    ]
    
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in generation_keywords)

@app.route("/", methods=["POST"])
def chat():
    """Main chat endpoint"""
    try:
        user_id = get_user_id(request)
        
        can_proceed, current_rate = rate_limit_check(user_id)
        if not can_proceed:
            return jsonify({
                "error": config.ERROR_MESSAGES["rate_limit"]
            }), 429
        
        can_use, current_count = check_usage_limit(user_id, "questions")
        if not can_use:
            return jsonify({
                "error": config.ERROR_MESSAGES["usage_limit"]
            }), 429
        
        data = request.get_json(force=True)
        message = data.get("message", "").strip()
        image_data = data.get("image")
        
        if not message and not image_data:
            return jsonify({
                "error": config.ERROR_MESSAGES["invalid_request"]
            }), 400
        
        if config.FEATURES["image_generation"] and detect_image_generation_request(message):
            return handle_image_generation(user_id, message)
        
        content_parts = []
        
        if message:
            full_message = f"{SYSTEM_PROMPT}\n\nUser: {message}"
            content_parts.append(full_message)
        elif image_data:
            content_parts.append(SYSTEM_PROMPT)
        
        if image_data:
            processed_image, error = process_image(image_data)
            if error:
                return jsonify({
                    "error": f"Image processing failed: {error}"
                }), 400
            content_parts.append(processed_image)
        
        start_time = time.time()
        
        response = model.generate_content(
            content_parts,
            generation_config=config.GENERATION_CONFIG,
            safety_settings=config.SAFETY_SETTINGS
        )
        
        duration = time.time() - start_time
        logger.info(f"Response generated in {duration:.2f}s for user {user_id[:8]}")
        
        increment_usage(user_id, "questions")
        
        reply = response.text.strip()
        remaining_questions = config.USAGE_LIMITS["max_questions_per_user"] - (current_count + 1)
        
        return jsonify({
            "reply": reply,
            "remaining_questions": remaining_questions,
            "response_time": round(duration, 2),
            "type": "text"
        })
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return jsonify({
            "error": config.ERROR_MESSAGES["generation_error"]
        }), 500

def handle_image_generation(user_id, prompt):
    """Handle image generation requests using Imagen 3"""
    try:
        can_generate, current_count = check_usage_limit(user_id, "image_generations")
        if not can_generate:
            return jsonify({
                "error": config.ERROR_MESSAGES["image_limit"]
            }), 429
        
        start_time = time.time()
        
        # Use the new Imagen 3 API with correct configuration
        response = imagen_client_instance.models.generate_images(
            model=config.IMAGE_MODEL_NAME,
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=config.IMAGE_GENERATION_CONFIG["number_of_images"],
                aspect_ratio=config.IMAGE_GENERATION_CONFIG["aspect_ratio"],
                safety_filter_level=config.IMAGE_GENERATION_CONFIG["safety_filter_level"],
                person_generation=config.IMAGE_GENERATION_CONFIG["person_generation"]
            )
        )
        
        duration = time.time() - start_time
        logger.info(f"Image generated in {duration:.2f}s for user {user_id[:8]}")
        
        increment_usage(user_id, "image_generations")
        
        # Convert the first generated image to base64
        if response.generated_images:
            image_bytes = response.generated_images[0].image.image_bytes
            image_data = base64.b64encode(image_bytes).decode('utf-8')
            
            remaining_generations = config.USAGE_LIMITS["max_image_generations_per_user"] - (current_count + 1)
            
            return jsonify({
                "reply": "Here's your generated image!",
                "image": f"data:image/jpeg;base64,{image_data}",
                "remaining_generations": remaining_generations,
                "response_time": round(duration, 2),
                "type": "image"
            })
        else:
            return jsonify({
                "error": "No images were generated"
            }), 500
        
    except Exception as e:
        logger.error(f"Image generation error: {e}")
        return jsonify({
            "error": f"Image generation failed: {str(e)}"
        }), 500

@app.route("/usage", methods=["GET"])
def get_usage():
    """Get current usage statistics"""
    try:
        user_id = get_user_id(request)
        can_use_q, current_questions = check_usage_limit(user_id, "questions")
        can_use_i, current_images = check_usage_limit(user_id, "image_generations")
        
        return jsonify({
            "questions": {
                "current": current_questions,
                "max": config.USAGE_LIMITS["max_questions_per_user"],
                "remaining": config.USAGE_LIMITS["max_questions_per_user"] - current_questions
            },
            "image_generations": {
                "current": current_images,
                "max": config.USAGE_LIMITS["max_image_generations_per_user"],
                "remaining": config.USAGE_LIMITS["max_image_generations_per_user"] - current_images
            },
            "reset_period": config.USAGE_LIMITS["reset_period"],
            "features": config.FEATURES
        })
    except Exception as e:
        logger.error(f"Usage check error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "model": config.MODEL_NAME,
        "features": config.FEATURES
    })

@app.route("/", methods=["GET"])
def hello():
    """Welcome message"""
    return jsonify({
        "message": "🚀 Flicker AI is running!",
        "version": "2.0",
        "model": config.MODEL_NAME,
        "features": {
            "chat": True,
            "image_analysis": config.FEATURES["image_analysis"],
            "image_generation": config.FEATURES["image_generation"]
        },
        "endpoints": {
            "chat": "POST /",
            "usage": "GET /usage",
            "health": "GET /health"
        }
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Starting Flicker AI on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)