from pathlib import Path

from fastapi import FastAPI, File, Query, UploadFile

import database
import transcriber

UPLOAD_DIRECTORY = Path(__file__).parent / "data" / "uploads"

app = FastAPI(title="HTX xData Technical Test")


@app.get("/health")
def health():
    """Return the status of the service."""
    return {"status": "ok"}


@app.post("/transcribe")
def transcribe(files: list[UploadFile] = File(...)):
    """Accepts audio files and returns transcriptions."""
    UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
    results = []
    for uploaded_file in files:
        original_name = Path(uploaded_file.filename)
        save_path = UPLOAD_DIRECTORY / original_name.name
        # If file name already exists, to add a suffix e.g. sample1.mp3 -> sample1_1.mp3
        counter = 1
        while save_path.exists():
            save_path = UPLOAD_DIRECTORY / f"{original_name.stem}_{counter}{original_name.suffix}"
            counter += 1
        save_path.write_bytes(uploaded_file.file.read())
        transcription = transcriber.transcribe(save_path)
        results.append(database.save_transcription(save_path.name, transcription))
    return results


@app.get("/transcriptions")
def get_transcriptions():
    """Retrieves all transcriptions from the database."""
    return database.get_all_transcriptions()


@app.get("/search")
def search(filename: str = Query(..., min_length=1)):
    """Query for transcriptions from the database."""
    return database.search_transcriptions(filename)
