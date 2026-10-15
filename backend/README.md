# Backend

A FastAPI service that provides the public REST API. It saves uploaded audio files, sends them to the separate
[model service](../model/README.md) for transcription, and stores the results in SQLite.
For setup instructions, see the [root README](../README.md).

## Files

| File | Purpose |
|---|---|
| `main.py` | API endpoints; saves uploads under unique names and calls the model service |
| `database.py` | SQLite table and queries |
| `data/` | Created at runtime: `transcriptions.db` and `uploads/` (git-ignored) |


## API reference

Interactive docs: **http://localhost:8000/docs**

### `GET /health`
Returns the status of the service.
```json
{"status": "ok"}
```

### `POST /transcribe`
Accepts one or more audio files (multipart form field `files`) and returns a result for each file.

- Supported formats: `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`
- If a file name already exists, a suffix is added: `sample1.mp3` → `sample1_1.mp3`

```bash
curl -F "files=@sample1.mp3" -F "files=@sample2.m4a" http://localhost:8000/transcribe
```

Response (`200 OK`):
```json
{
  "summary": {"submitted": 3, "succeeded": 2, "failed": 1},
  "results": [
    {
      "filename": "sample1.mp3",
      "status": "success",
      "record": {"id": 1, "filename": "sample1.mp3", "transcription": "Hello, this is a test.", "created_at": "2026-10-12T15:07:16Z"}
    },
    {
      "filename": "sample1.mp3",
      "status": "success",
      "record": {"id": 2, "filename": "sample1_1.mp3", "transcription": "Hello, this is a test.", "created_at": "2026-10-12T15:07:18Z"}
    },
    {"filename": "notes.txt", "status": "error", "error": "Unsupported file type"}
  ]
}
```
- `filename` is the name **as uploaded**; `record.filename` is the name **as stored** (it may have a suffix).
- **A `200` does not mean every file succeeded.** Check `summary` and each result's `status`.
- Per-file errors: `Unsupported file type`, `Could not transcribe file`, `Could not save transcription`.

| Status | When |
|---|---|
| `200` | The batch was processed (any mix of successes and failures) |
| `422` | No files were sent |
| `503` | The model service is unavailable, so nothing was processed |

### `GET /transcriptions`
Returns all transcriptions, oldest first.
```json
[
  {"id": 1, "filename": "sample1.mp3", "transcription": "Hello, this is a test.", "created_at": "2026-10-12T15:07:16Z"}
]
```

### `GET /search?filename=<text>`
Returns transcriptions whose file name **contains** `<text>`, ignoring case.
`/search?filename=sample1` matches both `sample1.mp3` and `Sample1_1.mp3`. Same response format as `/transcriptions`.


## Design decisions

### 1. REST API (FastAPI)

- **FastAPI:** built-in validation for file uploads and query parameters.
- **Sync (`def`) endpoints:** each upload waits for the model service to finish transcribing. FastAPI runs `def`
  endpoints in a worker thread pool, so other requests are still served while one is waiting.
- **Unique file names:** if `sample1.mp3` exists, the next upload is saved as `sample1_1.mp3`, then `sample1_2.mp3`.
  Files are opened in `"xb"` mode, which creates the file only if it doesn't already exist. That makes the
  name check and the file creation a single step, so two simultaneous uploads can't overwrite each other.
- **Per-file results with `200`:** each file is processed independently, so one bad file doesn't discard the
  others. Following common practice for bulk endpoints, the HTTP status describes the batch as a whole and each
  result carries its own outcome. `207 Multi-Status` was considered but not used: it comes from WebDAV and is
  less familiar to most JSON API clients.
- **Error handling:** the backend checks the model service's `/health` before processing a batch and returns `503`
  if it's down. If transcription or saving fails for a file, its upload is deleted, so no file is left without a
  database record.

### 2. Database (SQLite)

- **SQLite via Python's built-in `sqlite3`:** no database server or extra package. The database is a single file,
  `backend/data/transcriptions.db`, created on first start. A new connection is opened per query, since SQLite
  connections can't be shared across FastAPI's worker threads.
- **Schema:**
  ```sql
  CREATE TABLE transcriptions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      filename      TEXT NOT NULL UNIQUE,
      transcription TEXT NOT NULL,
      created_at    TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  )
  ```
- **`created_at` is a UTC timestamp in ISO 8601 format with `Z`** (e.g. `2026-10-11T14:52:50Z`), set by SQLite on insert.
  The `Z` marks it as UTC so clients can convert it to the viewer's timezone.
- **`?` placeholders, never string formatting:** user input is passed as data, never run as SQL. A search like
  `'; DROP TABLE transcriptions; --` is treated as plain text, which prevents SQL injection.
- **`INSERT ... RETURNING *`:** returns the new row, with its `id` and `created_at`, without a second query.
- **Search:** `LIKE '%text%'` gives a partial match, and SQLite's `LIKE` is case-insensitive for English letters.
  `%` and `_` in the search text are escaped, so they match literally instead of acting as wildcards
  (important because duplicate names get `_1`, `_2` suffixes).

### 3. Containerisation (Docker)

- **Docker image,** built on `python:3.12-slim` and run with the other services by the `docker-compose.yml` at
  the repo root.
- **Layer caching:** dependencies are installed before the code is copied, so code changes rebuild in seconds.
- **Startup order:** the backend starts only once the model service is healthy
  (`depends_on: condition: service_healthy`), so it never accepts uploads before Whisper has loaded.
- **Persistent data:** `backend/data/` is bind-mounted into the backend container (`./backend/data:/app/data`),
  so the database and uploads survive container restarts and are easy to inspect during development.
  We can use a Docker **named volume** if this application was productionised. 


## Assumptions

- **Audio files are reasonably short.** The backend waits up to 120 s for each file's transcription; very long
  files may time out.
- **The file type is identified by its extension.** File contents aren't inspected; undecodable files are
  reported as `Could not transcribe file`.
- **Single user, low traffic.** SQLite and synchronous processing are enough for this assignment, so there's no
  queue or background workers.
- **Files are processed one at a time.** For simplicity, `POST /transcribe` loops through the uploaded files, calls
  the model service for each and waits for it to finish. A production backend could send files concurrently or
  queue them as background jobs.
- **Search is by file name only,** matching the stored name (including any `_1` suffix).
- **No authentication.** The API is intended to run locally.
