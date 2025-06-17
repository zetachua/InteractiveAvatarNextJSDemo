from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from dotenv import load_dotenv
import numpy as np
from openai import OpenAI
import os
import parselmouth
import re
import spacy
import string
from werkzeug.utils import secure_filename
import whisper

app = Flask(__name__)
CORS(app)
load_dotenv()

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'temp')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

whisper_model = whisper.load_model("base")
nlp = spacy.load("en_core_web_sm")
client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

# Ensure the 'temp' folder exists
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

@app.route("/transcribe", methods=["POST"])
def transcribe():
    filename = request.args.get("file")
    if not filename:
        return jsonify({"error": "Missing file"}), 400
    
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], secure_filename(filename))
    if not os.path.isfile(file_path):
        return jsonify({"error": f"File not found: {filename}"}), 404

    try:
        result = whisper_model.transcribe(file_path, word_timestamps=True, language="en")
        return jsonify({
            "text": result["text"],
            "segments": result.get("segments", [])
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/intonationAnalysis", methods=["POST"])
def intonation_analysis():
    data = request.get_json()
    filename = data.get("file")
    script = data.get("script")
    segments = data.get("segments")
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], secure_filename(filename))
    if not os.path.isfile(file_path):
        return jsonify({"error": f"File not found: {filename}"}), 404

    all_words = []
    for segment in segments:
        all_words.extend(segment.get("words", []))

    def get_expected_emphasis(script):
        doc = nlp(script)
        emphasized = set()
        for token in doc:
            if token.pos_ in {"NOUN", "VERB", "ADJ", "PROPN"}:
                emphasized.add(token.text.lower())
        return emphasized
    
    def get_actual_emphasis(file_path, words):
        snd = parselmouth.Sound(file_path)
        pitch = snd.to_pitch()
        intensity = snd.to_intensity()
        pitch_values = pitch.selected_array["frequency"]
        time_stamps = pitch.xs()
        pitch_chart = [{"time": round(float(t), 2), "pitch": round(float(p), 2)} for t, p in zip(time_stamps, pitch_values) if p > 0]

        median_pitch = np.median(pitch_values[pitch_values > 0])
        intensity_values = [intensity.get_average(w["start"], w["end"]) for w in words]
        median_intensity = np.median([i for i in intensity_values if i > 0])

        results = {}
        for word in words:
            pitch_samples = [pitch.get_value_at_time(t) for t in np.linspace(word["start"], word["end"], num=5) if pitch.get_value_at_time(t) > 0]
            avg_pitch = np.mean(pitch_samples) if pitch_samples else 0
            avg_intensity = intensity.get_average(word["start"], word["end"])
            is_emphasized = (avg_pitch > 1.2 * median_pitch) or (avg_intensity > 1.2 * median_intensity)
            results[word["start"]] = bool(is_emphasized)
        return results, pitch_chart

    expected = get_expected_emphasis(script)
    actual, pitch_chart = get_actual_emphasis(file_path, all_words)

    words = []
    matches = 0
    total = len(all_words)
    for word in all_words:
        raw = word["word"].strip()
        cleaned = raw.lower().strip(string.punctuation)
        expected_emphasis = cleaned in expected
        actual_emphasis = actual.get(word["start"])
        words.append({
            "text": raw,
            "expected": expected_emphasis,
            "actual": actual_emphasis
        })

        if expected_emphasis == actual_emphasis:
            matches += 1

    score = int((matches / total) * 100) if total > 0 else 0

    return jsonify({
        "score": score,
        "words": words,
        "pitch": pitch_chart
    })

@app.route("/fluencyAnalysis", methods=["POST"])
def fluency_analysis():
    def compute_pause_score(words_and_pauses, fallback=False):
        pauses = [w for w in words_and_pauses if w["text"] == "**pause**"]
        total_pauses = len(pauses)
        total_words = len([w for w in words_and_pauses if w["text"] != "**pause**"])

        if total_pauses == 0:
            return 95 if not fallback else 90

        if not fallback:
            bad_pauses = sum(1 for w in pauses if w.get("classification") == "bad")
            bad_ratio = bad_pauses / total_pauses
            score = 100 - min(bad_ratio * 100 * 1.2, 60)
            if total_pauses / total_words > 0.2:
                score -= 10
            return max(round(score, 1), 0)

        # Fallback: estimate from data
        avg_gap = sum(w["gap"] for w in pauses) / total_pauses
        pause_rate = total_pauses / (total_words / 150)

        score = 100
        if pause_rate > 0.2:
            score -= min((pause_rate - 0.2) * 200, 30)
        if avg_gap > 1.0:
            score -= min((avg_gap - 1.0) * 50, 25)
        if avg_gap > 1.5 or pause_rate > 0.35:
            score -= 10
        return max(round(score, 1), 0)

    def compute_fluency_score(pause_score, articulation_rate, words_and_pauses):
        total_words = sum(1 for w in words_and_pauses if w["text"] != "**pause**")
        filler_count = sum(1 for w in words_and_pauses if w.get("filler"))
        hesitation_count = sum(1 for w in words_and_pauses if w.get("hesitation"))

        filler_ratio = filler_count / total_words if total_words > 0 else 0
        hesitation_ratio = hesitation_count / total_words if total_words > 0 else 0

        score = pause_score
        if articulation_rate < 110:
            score -= min((110 - articulation_rate) * 0.7, 20)
        elif articulation_rate > 200:
            score -= min((articulation_rate - 200) * 0.7, 15)
        if filler_ratio > 0.02:
            score -= min((filler_ratio - 0.02) * 100 * 2.5, 25)
        if hesitation_ratio > 0.01:
            score -= min((hesitation_ratio - 0.01) * 100 * 3.0, 25)
        return max(round(score), 0)

    data = request.get_json()
    segments = data.get("segments")

    all_words = [word for segment in segments for word in segment.get("words", [])]
    total_words = len(all_words)
    speaking_time = sum([w["end"] - w["start"] for w in all_words])
    total_duration = all_words[-1]["end"] - all_words[0]["start"] if len(all_words) > 1 else speaking_time

    pause_indices = []
    words_and_pauses = []
    for i, word in enumerate(all_words):
        if i > 0:
            gap = round(word["start"] - all_words[i - 1]["end"], 1)
            if gap > 0.3:
                pause = {"text": "**pause**", "gap": gap}
                pause_indices.append(len(words_and_pauses))
                words_and_pauses.append(pause)
        text = word["word"].strip()
        duration = word["end"] - word["start"]
        if duration > 0.8:
            words_and_pauses.append({"text": text, "hesitation": True})
        else:
            words_and_pauses.append({"text": text})

    # Identifying filler words
    filler_words = {
        "uh", "um", "er", "ah", "eh", "hmm", "okay",
        "like", "right", "so", "well", "just", "actually", "basically",
        "literally", "honestly", "really"
    }
    filler_phrases = {
        ("you", "know"), ("i", "mean"), ("kind", "of"), ("sort", "of"),
        ("to", "be", "honest"), ("in", "my", "opinion"),
        ("you", "see"), ("you", "get", "me"), ("you", "know", "what", "i", "mean")
    }

    def tag_fillers(words_and_pauses):
        def normalize(text):
            return re.sub(r"[^\w\s']", "", text.lower())

        i = 0
        while i < len(words_and_pauses):
            item = words_and_pauses[i]
            if item["text"] == "**pause**":
                i += 1
                continue

            found = False
            for length in range(5, 1, -1):
                if i + length <= len(words_and_pauses):
                    phrase = tuple(
                        normalize(wp["text"]) for wp in words_and_pauses[i:i+length]
                        if wp["text"] != "**pause**"
                    )
                    if phrase in filler_phrases:
                        for j in range(length):
                            words_and_pauses[i + j]["filler"] = True
                        i += length
                        found = True
                        break
            if not found:
                word_norm = normalize(item["text"])
                if word_norm in filler_words:
                    item["filler"] = True
                i += 1

    tag_fillers(words_and_pauses)

    articulation_rate = int(total_words / (speaking_time / 60)) if speaking_time > 0 else 0

    transcript = " ".join(
        f"[pause {round(w['gap'], 2)}]" if w["text"] == "**pause**" else w["text"]
        for w in words_and_pauses
    )

    prompt = f"""
        You are a speech fluency evaluator.
        Below is a transcript with pauses marked as [pause X] where X is the number of seconds. 
        Your task is to classify each pause as either "good" or "bad", and give a short reason why.
        A "good" pause may help emphasize a point or indicate a natural boundary in the speech.
        A "bad" pause may be disruptive, awkward, or break fluency unnecessarily.
        Transcript: "{transcript}"
        Return your answer as **only** a JSON list of objects:
        [
        {{"classification": "good" | "bad", "reason": "..." }},
        ...
        ]
        Do **not** include any explanation outside the JSON."
    """
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
    )
    feedback = response.choices[0].message.content.strip()
    feedback = re.sub(r"^```(json)?", "", feedback)
    feedback = re.sub(r"```$", "", feedback)
    feedback = feedback.strip()
    try:
        feedback = json.loads(feedback)
        pause_score = compute_pause_score(words_and_pauses, fallback=False)
    except Exception as e:
        print("LLM response could not be parsed")
        pause_score = compute_pause_score(words_and_pauses, fallback=True)

    for idx, fb in zip(pause_indices, feedback):
        words_and_pauses[idx]["classification"] = fb.get("classification")
        words_and_pauses[idx]["reason"] = fb.get("reason")

    return jsonify({
        "score": compute_fluency_score(pause_score, articulation_rate, words_and_pauses),
        "pause_score": pause_score,
        "articulation_rate_wpm": articulation_rate,
        "words": words_and_pauses
    })

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=8000)
