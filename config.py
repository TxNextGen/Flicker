API_KEY = ""
MEMORY_FILE = "memory.json"
MODEL_NAME = "gemini-2.5-flash"
MAX_HISTORY = 10

GENERATION_CONFIG = { #Currently has 0 filters, i still need to change it. PLS KEEP IT THIS WAY FOR TESTING! WE WILL CHANGE IT LATER ON! -Ben
    "safety_settings": [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
    ],
}
