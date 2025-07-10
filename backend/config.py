API_KEY = "AIzaSyACMaC6ESMCIk-4AMpMkN7BKegCSxMIHwE" #Limited, cause i am not paying money for this. If you get a error dm me.
MEMORY_FILE = "memory.json"
MODEL_NAME = "gemini-2.5-flash" # Changed Version should work now 
MAX_HISTORY = 10

GENERATION_CONFIG = {
"safety_settings": [
{"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ALL"},
{"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ALL"},
{"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ALL"},
{"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ALL"},
],
}
# ^^^ remove this. the default settings for safety are good enough - xpki
# ^^^ The safety settings are currently bugged for 2.5. Ill change them when google fixed them -Ben
