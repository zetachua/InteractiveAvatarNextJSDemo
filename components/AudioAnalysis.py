import os
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify
import whisper
from flask_cors import CORS
import audeer
import audonnx
import numpy as np
import librosa

# Initialize Flask app and Whisper model
app = Flask(__name__)
CORS(app)  # Allow all origins (you can be more specific here)

# Load the Whisper model
whisper_model = whisper.load_model("base")

# Temp directory to save uploaded files
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'temp')  # Absolute path
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the 'temp' folder exists
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Run this once to download the model for audio analysis (if necessary)
url = 'https://zenodo.org/record/6221127/files/w2v2-L-robust-12.6bc4a7fd-1.1.0.zip'
cache_root = audeer.mkdir('cache')
model_root = audeer.mkdir('model')
archive_path = audeer.download_url(url, cache_root, verbose=True)
audeer.extract_archive(archive_path, model_root)

print(f"Files will be saved to: {app.config['UPLOAD_FOLDER']}")  # Log the path

# Route for transcription (using Whisper model)
@app.route("/transcribe", methods=["POST"])
def transcribe():
    print("Handling transcription request")

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

    try:
        # Transcribe the audio using Whisper
        result = whisper_model.transcribe(file_path)
        text = result['text']
        print(f"Transcription result: {text}")

        # Return the transcription result as a response
        return jsonify({'text': text})
    
    except Exception as e:
        print(f"Error during transcription: {e}")
        return jsonify({'error': str(e)}), 500

# Route for audio analysis (arousal, dominance, and valence)
@app.route("/audio_analysis", methods=["POST"])
def audio_analysis():
    print("Handling audio analysis request")

    try:
        # Load the model for audio analysis
        model = audonnx.load(model_root)
        sampling_rate = 16000
        signal, _ = librosa.load(UPLOAD_FOLDER+'/audio.webm', sr=sampling_rate)

        # Analyzing arousal, dominance, and valence
        signal = signal.astype(np.float32)
        result = model(signal, sampling_rate)["logits"][0]

        # Convert np.float32 to native float
        arousal = float(result[0])
        dominance = float(result[1])
        valence = float(result[2])

        print(f"Arousal: {arousal}, Dominance: {dominance}, Valence: {valence}")

        # Return the audio analysis result
        return jsonify({
            "arousal": arousal,
            "dominance": dominance,
            "valence": valence,
        })
    
    except Exception as e:
        print(f"Error during audio analysis: {e}")
        return jsonify({'error': str(e)}), 500



if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=8000)  # Flask app on port 5000
