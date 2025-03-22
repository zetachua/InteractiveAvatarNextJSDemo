from fastapi import FastAPI, UploadFile, HTTPException
import whisper
import os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Load the Whisper model
model = whisper.load_model("base")

# CORS middleware to allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (you can be more specific here)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/transcribe")
async def transcribe(file: UploadFile):
    try:
        # Save the audio file temporarily
        audio_data = await file.read()
        temp_file_path = "/tmp/temp_audio_file"
        with open(temp_file_path, "wb") as f:
            f.write(audio_data)
        
        # Transcribe the audio
        result = model.transcribe(temp_file_path, word_timestamps=True)
        
        # Clean up the temporary file
        os.remove(temp_file_path)

        # Return the transcription
        return {"text": result["text"]}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during transcription: {str(e)}")

import audeer
import audonnx
import numpy as np
import librosa

# Run this once to download the model
url = 'https://zenodo.org/record/6221127/files/w2v2-L-robust-12.6bc4a7fd-1.1.0.zip'
cache_root = audeer.mkdir('cache')
model_root = audeer.mkdir('model')
archive_path = audeer.download_url(url, cache_root, verbose=True)
audeer.extract_archive(archive_path, model_root)

@app.post("/audio_analysis")
async def audio_analysis(file: UploadFile):
    try:
        # Save the audio file temporarily
        audio_data = await file.read()
        temp_file_path = "/tmp/temp_audio_file"
        with open(temp_file_path, "wb") as f:
            f.write(audio_data)

        model = audonnx.load(model_root)
        sampling_rate = 16000
        signal, sampling_rate = librosa.load(temp_file_path, sr=sampling_rate)

        # Analysing arousal, dominance, and valence
        model = audonnx.load("/Users/tohyihui/Documents/speech-analyzer/model")
        signal = signal.astype(np.float32)
        result = model(signal, sampling_rate)["logits"][0]
        arousal = result[0]
        dominance = result[1]
        valence = result[2]
        return {
            "arousal": arousal,
            "dominance": dominance,
            "valence": valence,
            "arousal_description": "Measures the intensity of emotion.",
            "dominance_description": "Measures the perceived level of control associated with emotion.",
            "valence_description": "Measures pleasantness or unpleasantness of emotion."
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during audio analysis: {str(e)}")
