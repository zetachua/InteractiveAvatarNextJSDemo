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
