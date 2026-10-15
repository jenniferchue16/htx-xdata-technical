import sqlite3

import pytest
import requests
from fastapi.testclient import TestClient

import database
import main

client = TestClient(main.app)


class FakeModelResponse:
    """Stands in for the model service's response, so the tests don't need Whisper."""

    def raise_for_status(self):
        pass

    def json(self):
        return {"transcription": "fake transcription"}


@pytest.fixture(autouse=True)
def fake_model_and_empty_data(monkeypatch):
    # Replace the backend's calls to the model service (health check and transcription)
    monkeypatch.setattr(main.requests, "get", lambda *arguments, **keyword_arguments: FakeModelResponse())
    monkeypatch.setattr(main.requests, "post", lambda *arguments, **keyword_arguments: FakeModelResponse())
    # Start each test with an empty database and upload folder
    with sqlite3.connect(database.DATABASE_PATH) as connection:
        connection.execute("DELETE FROM transcriptions")
    for path in main.UPLOAD_DIRECTORY.iterdir():
        path.unlink()


def upload(*filenames):
    return client.post("/transcribe", files=[("files", (filename, b"audio bytes")) for filename in filenames])


def search(text):
    return [row["filename"] for row in client.get("/search", params={"filename": text}).json()]


def test_transcribe_saves_each_file_and_renames_duplicates():
    response = upload("sample.mp3", "sample.mp3", "notes.txt")
    body = response.json()

    assert response.status_code == 200
    assert body["summary"] == {"submitted": 3, "succeeded": 2, "failed": 1}
    assert [result["record"]["filename"] for result in body["results"][:2]] == ["sample.mp3", "sample_1.mp3"]
    assert body["results"][2] == {"filename": "notes.txt", "status": "error", "error": "Unsupported file type"}

    saved = client.get("/transcriptions").json()
    assert [row["filename"] for row in saved] == ["sample.mp3", "sample_1.mp3"]
    assert all(row["transcription"] == "fake transcription" for row in saved)


def test_transcribe_returns_503_and_saves_nothing_when_model_service_is_down(monkeypatch):
    def model_unreachable(*arguments, **keyword_arguments):
        raise requests.ConnectionError()

    monkeypatch.setattr(main.requests, "get", model_unreachable)
    response = upload("sample.mp3")

    assert response.status_code == 503
    assert response.json() == {"detail": "Model service is unavailable"}
    assert list(main.UPLOAD_DIRECTORY.iterdir()) == []
    assert client.get("/transcriptions").json() == []


def test_search_matches_partial_names_ignoring_case_and_treats_underscore_literally():
    upload("sample.mp3", "sample.mp3", "other.wav")

    assert search("SAMPLE") == ["sample.mp3", "sample_1.mp3"]
    assert search("_1") == ["sample_1.mp3"]
