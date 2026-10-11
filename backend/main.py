from fastapi import FastAPI, File, Query, UploadFile

app = FastAPI(title="HTX xData Technical Test")


@app.get("/health")
def health():
    """Return the status of the service."""
    return {"status": "ok"}


@app.post("/transcribe")
def transcribe(files: list[UploadFile] = File(...)):
    """Accepts audio files and returns transcriptions."""
    # TODO: save each file under a unique name, transcribe it, store the result
    return [{"filename": f.filename, "transcription": ""} for f in files]


@app.get("/transcriptions")
def get_transcriptions():
    """Retrieves all transcriptions from the database."""
    # TODO: read from the database
    return []


@app.get("/search")
def search(filename: str = Query(..., min_length=1)):
    """Query for transcriptions from the database."""
    # TODO: query the database by file name
    return []
