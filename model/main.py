import tempfile
from pathlib import Path

from fastapi import FastAPI, File, UploadFile

import transcriber

app = FastAPI(title="Whisper Model Service")


@app.get("/health")
def health():
    """Return the status of the service. Only responds once the model has loaded."""
    return {"status": "ok"}


@app.post("/transcribe")
def transcribe(file: UploadFile = File(...)):
    """Transcribes a single audio file."""
    # librosa reads from a file path, so write the upload to a temporary file.
    with tempfile.NamedTemporaryFile(suffix=Path(file.filename).suffix, delete_on_close=False) as audio_file:
        audio_file.write(file.file.read())
        audio_file.close()
        transcription = transcriber.transcribe(audio_file.name)
    return {"transcription": transcription}
