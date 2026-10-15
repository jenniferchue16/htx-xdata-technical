# HTX xData Technical Test: Audio Transcription

A web application that transcribes uploaded audio files with OpenAI's
[Whisper](https://huggingface.co/openai/whisper-tiny) (`openai/whisper-tiny`), stores the results in SQLite,
and lets you list and search past transcriptions by audio file name.

## Architecture

- **frontend**: a React single-page app for uploading audio, listing transcriptions and searching them.
- **backend**: the public API (`/health`, `/transcribe`, `/transcriptions`, `/search`). It saves the uploaded files,
  calls the model service and stores the results.
- **model**: a separate service that turns audio into text. It stores nothing and is only reachable by the backend.

See [architecture.pdf](architecture.pdf) for the architecture diagram, plus a detailed diagram of each component
(upload flow, frontend, backend, model service, database) with its assumptions and considerations.

## Project structure

```
.
├── architecture.pdf     # architecture and component diagrams
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

## Running tests

The backend and frontend each have 3 unit tests, which run inside Docker. From the repository root:

```bash
docker build --progress=plain --no-cache-filter test --target test backend
docker build --progress=plain --no-cache-filter test --target test frontend
```

- Each command fails if any test fails. Look for `3 passed` in the output.
- `--progress=plain` shows each test's result, and `--no-cache-filter test` makes Docker re-run the tests every
  time instead of reusing the result of an earlier run.
- The tests replace the services they depend on with fakes, so they don't need the model or the backend to be
  running, and never touch the data in `backend/data/`.
- The tests are only run with these commands; they're not included in the images started by `docker compose up`.
- See the [backend](backend/README.md#tests) and [frontend](frontend/README.md#tests) READMEs for what each test checks.

## Documentation

- [architecture.pdf](architecture.pdf): architecture diagram and component diagrams

Each service has its own README with its API reference, design decisions, assumptions and known limitations:

- [backend/README.md](backend/README.md): public REST API and SQLite database
- [model/README.md](model/README.md): Whisper model service and audio preprocessing
- [frontend/README.md](frontend/README.md): React app, how it connects to the backend, and its Docker setup
