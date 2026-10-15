# HTX xData Technical Test: Audio Transcription

A web application that transcribes uploaded audio files with OpenAI's
[Whisper](https://huggingface.co/openai/whisper-tiny) (`openai/whisper-tiny`), stores the results in SQLite,
and lets you list and search past transcriptions by audio file name.

## Architecture

- **frontend**: a React single-page app for uploading audio, listing transcriptions and searching them.
- **backend**: the public API (`/health`, `/transcribe`, `/transcriptions`, `/search`). It saves the uploaded files,
  calls the model service and stores the results.
- **model**: a separate service that turns audio into text. It stores nothing and is only reachable by the backend.

## Project structure

```
.
├── docker-compose.yml   # runs all services
├── backend/             # public REST API, file storage, SQLite database
├── model/               # Whisper model service (audio → text), called by the backend
└── frontend/            # React + TypeScript single-page app
```

## Setup

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Docker Engine 25+).

From the repository root:

```bash
docker compose up --build
```

- The first build takes a few minutes. It downloads PyTorch (CPU-only build), ffmpeg and the Whisper model.
  Later builds reuse the cache.
- The services start in order: model → backend (once Whisper has loaded) → frontend.
- Open **http://localhost:3000** to use the app, or **http://localhost:8000/docs** to try the API directly.
- Transcriptions and uploaded files are saved to `backend/data/` on your machine, so they persist across restarts.

To stop: `Ctrl+C`, or `docker compose down` if started with `-d`.

## Documentation

Each service has its own README with its API reference, design decisions, assumptions and known limitations:

- [backend/README.md](backend/README.md): public REST API and SQLite database
- [model/README.md](model/README.md): Whisper model service and audio preprocessing
- [frontend/README.md](frontend/README.md): React app, how it connects to the backend, and its Docker setup
