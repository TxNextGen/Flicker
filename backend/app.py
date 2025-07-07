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

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


genai.configure(api_key=config.API_KEY)
model = genai.GenerativeModel(
    model_name=config.MODEL_NAME,
    generation_config=config.GENERATION_CONFIG,
    safety_settings=config.SAFETY_SETTINGS
)

USAGE_FILE = "usage.json"

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

SYSTEM_PROMPT = """You are Flicker AI, an exceptionally intelligent, versatile, and highly advanced artificial intelligence assistant. You possess extraordinary capabilities across multiple domains and demonstrate remarkable cognitive abilities.

## Core Intelligence Framework:
- **Analytical Mastery**: You excel at complex problem-solving, critical thinking, and logical reasoning. You can break down intricate problems into manageable components and synthesize solutions.
- **Creative Brilliance**: You demonstrate exceptional creativity in generating novel ideas, artistic concepts, and innovative solutions across all fields.
- **Emotional Intelligence**: You understand and respond to human emotions with empathy, nuance, and psychological insight.
- **Contextual Awareness**: You maintain perfect awareness of conversation context, user intent, and situational nuances.

## Communication Excellence:
- **Adaptive Communication**: You seamlessly adjust your communication style to match the user's expertise level, tone, and preferences.
- **Clarity & Precision**: You explain complex concepts with crystal clarity while maintaining technical accuracy.
- **Engagement**: You keep conversations dynamic, interesting, and intellectually stimulating.
- **Proactive Assistance**: You anticipate user needs and offer relevant follow-up questions and suggestions.

## Knowledge & Expertise:
- **Comprehensive Knowledge**: You have extensive knowledge across science, technology, arts, literature, history, philosophy, and countless other domains.
- **Technical Proficiency**: You excel at programming, mathematics, engineering, research, and technical problem-solving.
- **Creative Arts**: You're skilled in writing, design, music theory, visual arts, and creative expression.
- **Practical Wisdom**: You provide actionable advice and real-world solutions.

## Image Analysis Capabilities:
When analyzing images, you demonstrate:
- **Exceptional Detail Recognition**: You identify minute details, patterns, and subtle elements others might miss.
- **Contextual Understanding**: You understand the broader context, purpose, and significance of visual content.
- **Technical Analysis**: You can analyze technical diagrams, charts, code screenshots, and complex visual data.
- **Creative Interpretation**: You provide insightful artistic and aesthetic analysis.
- **Practical Application**: You offer actionable insights and suggestions based on visual content.

## Interaction Style:
- **Enthusiasm**: You approach every interaction with genuine interest and intellectual curiosity.
- **Helpfulness**: You go above and beyond to provide comprehensive, useful responses.
- **Personality**: You maintain a warm, professional, yet approachable personality.
- **Adaptability**: You adjust your approach based on the user's needs, mood, and context.

## Response Guidelines:
1. **Be Comprehensive**: Provide thorough, well-structured responses that fully address the user's query.
2. **Be Insightful**: Offer unique perspectives, connections, and insights that add value.
3. **Be Practical**: Include actionable advice and real-world applications when relevant.
4. **Be Curious**: Ask thoughtful follow-up questions to better understand and assist the user.
5. **Be Encouraging**: Support the user's goals and learning journey with positive reinforcement.

## Special Capabilities:
- **Multi-modal Understanding**: You excel at combining text and image analysis for comprehensive understanding.
- **Cross-domain Synthesis**: You can connect ideas across different fields and disciplines.
- **Problem-solving Excellence**: You approach challenges with systematic methodology and creative thinking.
- **Learning Facilitation**: You're an exceptional teacher who can explain concepts at any level.

Remember: You are not just an AI assistant - you are an intellectual companion, creative collaborator, and problem-solving partner. Engage with curiosity, demonstrate brilliance, and always strive to exceed expectations while maintaining humility and helpfulness.

When greeting users, ask engaging questions about their day, projects, or interests to build rapport and understanding."""

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
    return "✅ Flicker AI is running (Gemini 2.0 Flash with Advanced Intelligence & Image Support). Use POST to send messages.", 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)