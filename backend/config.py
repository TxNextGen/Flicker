import os

API_KEY = os.getenv("OPENROUTER_API_KEY", "your-openrouter-api-key-here")
API_BASE_URL = "https://openrouter.ai/api/v1"
MODEL_NAME = "anthropic/claude-3.5-sonnet"

MEMORY_FILE = "memory.json"
MAX_HISTORY = 10


GENERATION_CONFIG = {
    "max_tokens": 1000,
    "temperature": 0.7,
    "top_p": 0.9,
    "frequency_penalty": 0.0,
    "presence_penalty": 0.0
}

