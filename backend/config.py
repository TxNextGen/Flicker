API_KEY = "AIzaSyDT2aBkKfb0JVSs9hKXA7NOPiOKEk3fJ-U" #Limited, cause i am not paying money for this. If you get a error dm me.
MEMORY_FILE = "memory.json"
MODEL_NAME = "gemini-2.0-flash" # Changed Version should work now 
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
# ^^^ The safety settings are currently bugged for 2.5. Ill change them when google fixed them -Ben
