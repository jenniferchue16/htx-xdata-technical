"""Whisper model service: receives one audio file and returns its transcription. Stateless, internal only."""

from fastapi import FastAPI, File, UploadFile

import transcriber

app = FastAPI(title="Whisper Model Service")


@app.get("/health")
def health():
    """Return the status of the service. Only responds once the model has loaded."""
    return {"status": "ok"}


@app.post("/transcribe")
def transcribe(file: UploadFile = File(...)):
    """Transcribes a single audio file, read directly from the upload."""
    return {"transcription": transcriber.transcribe(file.file)}
