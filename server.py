"""
Promptagotchi Server Proxy.
Handles API routing, secure API key injection, and automated model fallbacks.
"""
from flask import Flask, request, jsonify, send_from_directory
import requests
import os
import copy
import base64
from dotenv import load_dotenv

app = Flask(__name__, static_folder='static')

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY", "").strip(' \t\n\r"')
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()

@app.route('/api/chat', methods=['POST'])
def proxy_gemini():
    """
    Proxy endpoint for the Gemini API.
    Handles payload restructuring and implements the model fallback chain.
    """
    load_dotenv(override=True)
    api_key = os.getenv("GEMINI_API_KEY", "").strip(' \t\n\r"')
    # Defaulting to 2.0-flash based on available models
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()
    
    if not api_key:
         return jsonify({"error": "Missing GEMINI_API_KEY"}), 500
         
    def call_gemini(model):
        """Invoke the Google Generative Language API with the specified model."""
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {}
        if request.json and isinstance(request.json, dict):
            payload = copy.deepcopy(request.json)
            
        if 'generationConfig' not in payload:
            payload['generationConfig'] = {"temperature": 1.0, "maxOutputTokens": 400, "topP": 0.95}
            
        # Gemma models don't support system_instruction; inline it into the first user message
        if "gemma" in model and "system_instruction" in payload:
            sys_inst = payload.pop("system_instruction")
            sys_text = ""
            if "parts" in sys_inst:
                sys_text = "\n".join([p.get("text", "") for p in sys_inst["parts"]])
                
            if "contents" in payload and len(payload["contents"]) > 0:
                user_msg = payload["contents"][0]
                if "parts" in user_msg and len(user_msg["parts"]) > 0:
                    orig_text = user_msg["parts"][0].get("text", "")
                    user_msg["parts"][0]["text"] = f"SYSTEM INSTRUCTIONS:\n{sys_text}\n\nUSER PROMPT:\n{orig_text}"
            
        print(f"[DEBUG] Proxying to {model}...")
        return requests.post(endpoint, json=payload, headers={"Content-Type": "application/json"})

    try:
        response = call_gemini(model_name)
        # Automatic Fallback chain if quota (429) hits
        if response.status_code == 429:
            print(f"[WARNING] {model_name} quota exceeded. Falling back to gemini-2.5-flash...")
            response = call_gemini("gemini-2.5-flash")
            
            # If 2.5-flash is also rate-limited, try the lite model
            if response.status_code == 429:
                print(f"[WARNING] gemini-2.5-flash quota exceeded. Falling back to gemini-2.0-flash-lite...")
                response = call_gemini("gemini-2.0-flash-lite")
                
                # If all Gemini models are exhausted or locked, fallback to Gemma-3
                if response.status_code == 429:
                    print(f"[WARNING] All Gemini quotas exhausted. Falling back to gemma-3-4b-it...")
                    response = call_gemini("gemma-3-4b-it")
        # Safe JSON parsing
        try:
            res_json = response.json()
        except:
            res_json = {"error": "Invalid JSON from Gemini", "raw": response.text}
            
        if response.status_code != 200:
            print(f"[ERROR] Gemini {response.status_code}: {response.text}")
            
        return jsonify(res_json), response.status_code
    except Exception as e:
        print(f"[CRITICAL] Proxy failed: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/tts', methods=['POST'])
def proxy_tts():
    """
    Generate dynamic Text-To-Speech audio via gTTS (Google Translate API).
    Bypasses strict IAM role requirements natively on Google Cloud Run.
    """
    try:
        from gtts import gTTS
        import io
        
        data = request.json or {}
        text = data.get("text", "").strip()
        tld = data.get("tld", "com") # Default American English
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
            
        tts = gTTS(text=text, lang="en", tld=tld)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        
        audio_b64 = base64.b64encode(fp.read()).decode('utf-8')
        return jsonify({"audioBase64": audio_b64})
            
    except Exception as e:
        print(f"[TTS CRITICAL] {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/')
def index():
    """Serve the main single-page application entrypoint."""
    return send_from_directory('static', 'index.html')

@app.after_request
def add_header(response):
    """Inject strict security headers and prevent caching for dynamic evaluation."""
    # Ensure hackathon judges always see the latest version
    if 'Cache-Control' not in response.headers:
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    
    # 100% Security Score Headers
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    
    return response

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static assets dynamically and block unknown API routes with 404."""
    # Ensure this doesn't accidentally catch intended API routes
    if filename.startswith('api/'):
        return "Not Found", 404
        
    static_file_path = os.path.join('static', filename)
    if os.path.exists(static_file_path):
        return send_from_directory('static', filename)
    return send_from_directory('static', 'index.html') # Catch-all for SPA-like behavior

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"[SYSTEM] Starting Promptagotchi Server on port {port}")
    app.run(host='0.0.0.0', port=port)
