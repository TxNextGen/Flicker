API_KEY = "shouldbekeptsecret" # use an environment file to securely store the api keys
MEMORY_FILE = "memory.json"
MODEL_NAME = "gemini-2.5-flash" # Changed Version should work now 
MAX_HISTORY = 10

GENERATION_CONFIG = {
"safety_settings": [ # optimal and default safety settings
{"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ALL"},
{"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ALL"},
{"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ALL"},
{"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ALL"},
],
}
# ^^^ remove this. the default settings for safety are good enough - xpki
# ^^^ The safety settings are currently bugged for 2.5. Ill change them when google fixed them -Ben
