from fastapi import FastAPI, UploadFile, HTTPException
from typing import List, Dict
import whisper
import os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow requests from your frontend (change the origin as needed)
origins = [
    "http://localhost:3000",  # for local development (if using React or Next.js locally)
    "https://interactive-avatar-next-js-demo-olive.vercel.app",  # your deployed frontend URL
]

# CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # allow all methods
    allow_headers=["*"],  # allow all headers
)

# Load the Whisper model
model = whisper.load_model("base")

# Function to compute pauses between speech segments
def compute_pauses(segments: List[Dict]) -> List[Dict[str, float]]:
    pauses = []
    for i in range(1, len(segments)):
        prev_end = segments[i - 1]["end"]
        curr_start = segments[i]["start"]
        if curr_start - prev_end > 0.5:  # 0.5s threshold for a pause
            pauses.append({"start": prev_end, "end": curr_start})
    return pauses

# Endpoint for transcribing audio
@app.post("/transcribe")
async def transcribe(file: UploadFile):
    try:
        print("im in the transcribe python file")
        # Check file extension
        if not file.filename.endswith(('.wav', '.mp3', '.webm')):
            raise HTTPException(status_code=400, detail="Invalid file format. Please upload a .wav, .mp3, or .webm file.")
        
        # Read the file data
        audio_data = await file.read()

        # Store the temporary file in the server's /tmp directory (for serverless platforms)
        temp_file_path = "/tmp/temp_audio_file"
        with open(temp_file_path, "wb") as f:
            f.write(audio_data)
        
        # Transcribe the audio file using Whisper
        result = model.transcribe(temp_file_path, word_timestamps=True)

        # Compute pauses
        pauses = compute_pauses(result["segments"])

        # Clean up the temporary file
        os.remove(temp_file_path)

        # Return the transcription text and pauses
        return {"text": result["text"], "pauses": pauses}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during transcription: {str(e)}")
