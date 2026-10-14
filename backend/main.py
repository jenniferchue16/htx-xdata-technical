"""Public REST API: saves uploaded audio, gets transcriptions from the model service and stores them in SQLite."""

import os
import sqlite3
from pathlib import Path

import requests
from fastapi import FastAPI, File, HTTPException, Query, UploadFile

import database

UPLOAD_DIRECTORY = Path(__file__).parent / "data" / "uploads"
UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
# Docker Compose sets this to http://model:8001; the default is for running locally
MODEL_URL = os.getenv("MODEL_URL", "http://localhost:8001")
ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".flac", ".ogg"}

app = FastAPI(title="HTX xData Technical Test")


@app.get("/health")
def health():
    """Return the status of the service."""
    return {"status": "ok"}


@app.post("/transcribe")
def transcribe(files: list[UploadFile] = File(...)):
    """Accepts audio files and returns a transcription result for each file.

    Each file is processed independently, so a 200 response does not mean every file succeeded:
    check "summary" and each result's "status".
    """
    try:
        requests.get(f"{MODEL_URL}/health", timeout=5).raise_for_status()
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Model service is unavailable")

    results = []
    for uploaded_file in files:
        original_name = Path(uploaded_file.filename)
        if original_name.suffix.lower() not in ALLOWED_EXTENSIONS:
            results.append({"filename": original_name.name, "status": "error", "error": "Unsupported file type"})
            continue

        save_path = UPLOAD_DIRECTORY / original_name.name
        # If the file name already exists, add a suffix e.g. sample1.mp3 -> sample1_1.mp3.
        # "xb" mode only creates a new file, so concurrent uploads can't overwrite each other.
        counter = 1
        while True:
            try:
                with save_path.open("xb") as saved_file:
                    saved_file.write(uploaded_file.file.read())
                break
            except FileExistsError:
                save_path = UPLOAD_DIRECTORY / f"{original_name.stem}_{counter}{original_name.suffix}"
                counter += 1

        # Send the audio to the model service. On failure, delete the saved file
        try:
            with save_path.open("rb") as audio_file:
                response = requests.post(
                    f"{MODEL_URL}/transcribe", files={"file": (save_path.name, audio_file)}, timeout=120
                )
            response.raise_for_status()
        except requests.RequestException:
            save_path.unlink()
            results.append({"filename": original_name.name, "status": "error", "error": "Could not transcribe file"})
            continue

        try:
            record = database.save_transcription(save_path.name, response.json()["transcription"])
        except sqlite3.Error:
            save_path.unlink()
            results.append({"filename": original_name.name, "status": "error", "error": "Could not save transcription"})
            continue
        results.append({"filename": original_name.name, "status": "success", "record": record})

    succeeded = sum(result["status"] == "success" for result in results)
    return {
        "summary": {"submitted": len(results), "succeeded": succeeded, "failed": len(results) - succeeded},
        "results": results,
    }


@app.get("/transcriptions")
def get_transcriptions():
    """Retrieves all transcriptions from the database, oldest first."""
    return database.get_all_transcriptions()


@app.get("/search")
def search(filename: str = Query(..., min_length=1)):
    """Returns transcriptions whose audio file name contains `filename` (case-insensitive)."""
    return database.search_transcriptions(filename)
