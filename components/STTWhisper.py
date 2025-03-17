import os
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify
import whisper

from flask_cors import CORS

# Initialize Flask app and Whisper model
app = Flask(__name__)
CORS(app)  # Allow all origins, or specify http://localhost:3000
model = whisper.load_model("base")

# Temp directory to save uploaded files
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'temp')  # Absolute path
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the 'temp' folder exists
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

print(f"Files will be saved to: {app.config['UPLOAD_FOLDER']}")  # Log the path

# Route for transcription
@app.route("/transcribe", methods=["POST"])
def transcribe():
    # Check if the file is present in the request
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file found'}), 400

    file = request.files['audio']
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    # Log the path where the file is being saved
    print(f"Saving file to: {file_path}")

    # Save the file to the server
    file.save(file_path)

    # Transcribe the audio using Whisper
    result = model.transcribe(file_path)
    text = result['text']
    print(text,"this is the audio file")
    # Return the transcription result
    return jsonify({'text': text})

if __name__ == "__main__":
    app.run(debug=True)
