import os

API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyDT2aBkKfb0JVSs9hKXA7NOPiOKEk3fJ-U")
MODEL_NAME = "gemini-2.0-flash-exp"
MEMORY_FILE = "memory.json"
MAX_HISTORY = 10

USAGE_LIMITS = {
    "max_questions_per_user": 50,
    "reset_period": "daily",
    "reset_time": "00:00",
}

GENERATION_CONFIG = {
    "temperature": 0.7,
    "top_p": 0.9,
    "top_k": 40,
    "max_output_tokens": 8192,
    "candidate_count": 1,
}

SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]