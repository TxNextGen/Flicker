import os

API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyDT2aBkKfb0JVSs9hKXA7NOPiOKEk3fJ-U")
MODEL_NAME = "gemini-2.0-flash-exp"  # This the Newest Version Unlike The old Crappy Version Leben Programmed
IMAGE_MODEL_NAME = "imagen-3.0-generate-002"  # Updated to the correct model name

MEMORY_FILE = "memory.json"
USAGE_FILE = "usage_data.json"
MAX_HISTORY = 15

USAGE_LIMITS = {
    "max_questions_per_user": 100,
    "max_image_generations_per_user": 20,
    "reset_period": "daily",
    "reset_time": "00:00",
}

GENERATION_CONFIG = {
    "temperature": 0.8,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 8192,
    "candidate_count": 1,
    "response_mime_type": "text/plain",
}

IMAGE_GENERATION_CONFIG = {
    "number_of_images": 1,
    "aspect_ratio": "1:1",
    "safety_filter_level": "BLOCK_LOW_AND_ABOVE",  
    "person_generation": "ALLOW_ADULT",
}

SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

RATE_LIMITING = {
    "requests_per_minute": 60,
    "burst_limit": 10,
    "cooldown_period": 1,
}

FEATURES = {
    "image_analysis": True,
    "image_generation": True,
    "conversation_memory": True,
    "advanced_reasoning": True,
    "code_execution": False,
}

ERROR_MESSAGES = {
    "rate_limit": "Too many requests. Please wait a moment before trying again.",
    "usage_limit": "Daily usage limit reached. Limits reset at midnight.",
    "image_limit": "Daily image generation limit reached. Try again tomorrow.",
    "invalid_request": "Invalid request format. Please check your input.",
    "server_error": "Something went wrong on our end. Please try again.",
    "image_processing_error": "Failed to process image. Please try a different image.",
    "generation_error": "Failed to generate response. Please try again.",
}

LOG_LEVEL = "INFO"
LOG_FILE = "app.log"
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"