from fastapi import FastAPI, UploadFile
import whisper
from typing import List, Dict

app = FastAPI()
model = whisper.load_model("base")  # Use "small", "medium", etc. for better accuracy

def compute_pauses(segments: List[Dict]) -> List[Dict[str, float]]:
    pauses = []
    for i in range(1, len(segments)):
        prev_end = segments[i - 1]["end"]
        curr_start = segments[i]["start"]
        if curr_start - prev_end > 0.5:  # 0.5s threshold for a pause
            pauses.append({"start": prev_end, "end": curr_start})
    return pauses

@app.post("/transcribe")
async def transcribe(file: UploadFile):
    audio_data = await file.read()
    with open("temp.wav", "wb") as f:
        f.write(audio_data)
    
    result = model.transcribe("temp.wav", word_timestamps=True)
    pauses = compute_pauses(result["segments"])
    
    return {"text": result["text"], "pauses": pauses}