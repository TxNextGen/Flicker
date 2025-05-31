API_KEY = "AIzaSyBJ1-UaTNKaYs2rrUf7bC5wgJMev3nxdm4" #Limited, cause i am not paying money for this. If you get a error dm me.
MEMORY_FILE = "memory.json"
MODEL_NAME = "gemini-2.5-flash-preview-04-17" # changed from gemini-2.5-flash because that doesnt exist lol - xpki
MAX_HISTORY = 10

GENERATION_CONFIG = { #Currently has 0 filters, i still need to change it. PLS KEEP IT THIS WAY FOR TESTING! WE WILL CHANGE IT LATER ON! -Ben
    "safety_settings": [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
    ],
}
# ^^^ remove this. the default settings for safety are good enough - xpki