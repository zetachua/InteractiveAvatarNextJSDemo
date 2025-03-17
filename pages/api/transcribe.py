import os
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify
import whisper
from flask_cors import CORS

# Initialize Flask app and Whisper model
app = Flask(__name__)
CORS(app)  # Allow CORS for cross-origin requests

# Load Whisper model (loaded once per cold start)
model = whisper.load_model("base")

# Temp directory for file storage (serverless environments provide /tmp)
UPLOAD_FOLDER = '/tmp'  # Vercel's writable temp directory
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the temp folder exists (create it if needed)
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Define the transcription endpoint
@app.route("/transcribe", methods=["POST"])
def transcribe():
    # Check if the file is present in the request
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file found'}), 400

    file = request.files['audio']
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    # Save the file temporarily
    file.save(file_path)

    try:
        # Transcribe the audio using Whisper
        result = model.transcribe(file_path)
        text = result['text'].strip()
        print(f"Transcription: {text}")
        
        # Return the transcription result
        return jsonify({'text': text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Clean up the temporary file
        if os.path.exists(file_path):
            os.remove(file_path)

# Vercel handler (no app.run() needed)
def handler(request):
    return app(request.environ, request.start_response)