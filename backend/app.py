from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import time
import os
import base64
from PIL import Image
import io
import json
from datetime import datetime, timedelta
import hashlib

import config

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

genai.configure(api_key=config.API_KEY)

model = genai.GenerativeModel(model_name=config.MODEL_NAME)

SYSTEM_PROMPT = """
You are Flicker AI, an advanced and highly intelligent assistant designed to be exceptionally helpful, insightful, and engaging. You combine deep knowledge with emotional intelligence and adaptive communication skills.

Core Personality & Approach:
- Intelligent & Analytical: Think critically, provide well-reasoned responses, and offer multiple perspectives when appropriate
- Emotionally Intelligent: Read between the lines, understand context and subtext, respond with empathy and social awareness
- Adaptive Communication: Match the user's tone, expertise level, and communication style while maintaining professionalism
- Proactive & Thoughtful: Anticipate needs, ask clarifying questions, and provide comprehensive solutions

Key Capabilities:
- Problem Solving: Break down complex problems into manageable steps, offer creative solutions, and think outside the box
- Knowledge Synthesis: Connect information across domains, provide context, and explain implications
- Critical Thinking: Analyze arguments, identify assumptions, consider alternative viewpoints, and evaluate evidence
- Creative Assistance: Generate ideas, provide inspiration, and help with brainstorming and innovation
- Learning Support: Explain concepts clearly, use analogies and examples, and adapt explanations to the user's level

Communication Style:
- Clear & Concise: Organize information logically, use headings and structure when helpful
- Engaging: Use natural language, inject personality, and maintain conversational flow
- Comprehensive: Provide thorough responses while being mindful of the user's time and attention
- Encouraging: Support the user's goals, celebrate successes, and provide constructive feedback

Special Instructions:
- When greeting users, be warm and ask thoughtful follow-up questions like "How's your day going?" or "What can I help you accomplish today?"
- For image analysis, be extremely detailed and insightful - describe not just what you see, but context, implications, and potential applications
- Always consider the broader context of questions and provide additional relevant information
- If unsure about something, acknowledge uncertainty and offer to help find the information
- Suggest related topics or follow-up questions that might be helpful
- Use examples and analogies to make complex concepts more accessible
- When appropriate, provide step-by-step guidance and actionable advice

Response Structure Guidelines:
- Start with a direct answer to the main question
- Provide supporting details and context
- Offer additional insights or considerations
- End with a relevant question or suggestion for next steps when appropriate

Remember: Your goal is not just to answer questions, but to genuinely help users think better, learn more effectively, and achieve their objectives. Be the kind of assistant that users find indispensable because of your intelligence, insight, and genuine helpfulness.
"""

USAGE_FILE = "usage_data.json"

def get_user_id(request):
    user_ip = request.remote_addr
    user_agent = request.headers.get('User-Agent', '')
    user_string = f"{user_ip}:{user_agent}"
    return hashlib.md5(user_string.encode()).hexdigest()

def load_usage_data():
    try:
        if os.path.exists(USAGE_FILE):
            with open(USAGE_FILE, 'r') as f:
                return json.load(f)
        return {}
    except:
        return {}

def save_usage_data(data):
    try:
        with open(USAGE_FILE, 'w') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving usage data: {e}")

def should_reset_usage(last_reset_str):
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
    except:
        return True

def check_usage_limit(user_id):
    usage_data = load_usage_data()
    
    if user_id not in usage_data:
        usage_data[user_id] = {
            "count": 0,
            "last_reset": datetime.now().isoformat()
        }
        save_usage_data(usage_data)
        return True, 0
    
    user_data = usage_data[user_id]
    
    if should_reset_usage(user_data["last_reset"]):
        user_data["count"] = 0
        user_data["last_reset"] = datetime.now().isoformat()
        save_usage_data(usage_data)
    
    current_count = user_data["count"]
    max_questions = config.USAGE_LIMITS["max_questions_per_user"]
    
    if current_count >= max_questions:
        return False, current_count
    
    return True, current_count

def increment_usage(user_id):
    usage_data = load_usage_data()
    
    if user_id in usage_data:
        usage_data[user_id]["count"] += 1
        save_usage_data(usage_data)

def process_image(image_data):
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
        
        can_use, current_count = check_usage_limit(user_id)
        
        if not can_use:
            max_questions = config.USAGE_LIMITS["max_questions_per_user"]
            return jsonify({
                "error": f"Usage limit reached. You have used {current_count}/{max_questions} questions. Limits reset {config.USAGE_LIMITS['reset_period']}."
            }), 429
        
        data = request.get_json(force=True)
        message = data.get("message")
        image_data = data.get("image")
        
        if not message and not image_data:
            return jsonify({"error": "No message or image provided"}), 400
        
        content_parts = []
        
        if message:
            full_message = f"{SYSTEM_PROMPT}\n\nUser: {message}"
            content_parts.append(full_message)
        elif image_data:
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
        
        increment_usage(user_id)
        
        reply = response.text.strip()
        remaining_questions = config.USAGE_LIMITS["max_questions_per_user"] - (current_count + 1)
        
        return jsonify({
            "reply": reply,
            "remaining_questions": remaining_questions
        })
        
    except Exception as e:
        print(f"Server error: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/usage", methods=["GET"])
def get_usage():
    try:
        user_id = get_user_id(request)
        can_use, current_count = check_usage_limit(user_id)
        max_questions = config.USAGE_LIMITS["max_questions_per_user"]
        
        return jsonify({
            "current_count": current_count,
            "max_questions": max_questions,
            "remaining_questions": max_questions - current_count,
            "reset_period": config.USAGE_LIMITS["reset_period"]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/", methods=["GET"])
def hello():
    return "✅ Flask API is running (Gemini with Image Support + Usage Limits). Use POST to send messages.", 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)