# Frontend

A React single-page application for uploading audio files, viewing all transcriptions and searching them by
file name. It talks to the [backend](../backend/README.md) through `/api`.
For setup instructions, see the [root README](../README.md).

Open **http://localhost:3000** once the stack is running.

## Files

| File | Purpose |
|---|---|
| `src/App.tsx` | Page layout; connects the upload form and the transcription list |
| `src/UploadForm.tsx` | Single and batch upload, with a result for each file |
| `src/TranscriptionList.tsx` | List of all transcriptions, and search by file name |
| `src/api.ts` | The three backend calls, with TypeScript types for every response |
| `src/*.test.ts(x)` | Unit tests (see [Tests](#tests)) |
| `vite.config.ts` | Vite build settings |
| `nginx.conf` | Serves the app and forwards `/api` to the backend |
| `Dockerfile` | Two-stage build: Node builds the app, nginx serves it |

## Features

| Feature | How it works |
|---|---|
| **Upload audio** | Choose one or more files and click **Transcribe**. Supported formats include `.mp3`, `.wav`, `.flac`, `.ogg`. Each file gets its own ✓ or ✗ with the transcription or the error, plus a summary ("2 of 3 transcribed"). If the backend renamed a duplicate, it shows "(saved as sample_1.mp3)". Close the results with ×. |
| **List transcriptions** | All transcriptions, oldest first, with file name, time and transcript. The list reloads automatically after each upload. |
| **Search by file name** | Type part of a name and press **Search** or Enter. **Clear** returns to the full list. |

## How the frontend talks to the backend

The browser only calls its own address, `http://localhost:3000/api/...`. nginx forwards these requests to the
backend's `POST /transcribe`, `GET /transcriptions` and `GET /search` endpoints, removing the `/api` prefix:

```
/api/search?filename=x  →  http://backend:8000/search?filename=x
```

This avoids cross-origin requests: a page can't read responses from a different origin (another port counts as a
different origin) unless the backend explicitly allows it with CORS. Going through the frontend's own address
needs no backend changes.


## Design decisions

### 1. Framework and tooling

- **React single-page application:** the page loads once and React updates it as you interact, without
  navigating between pages.
- **TypeScript (strict mode):** `api.ts` describes exactly what the backend returns, so mistakes such as a
  misspelled field are caught before the app runs. The build type-checks first, so a type error fails the Docker
  build.
- **Tailwind CSS:** styles are written as classes in the components, so there's no separate stylesheet to keep in
  sync. The colours and fonts are defined once as design tokens in `src/index.css`.
- **Vite:** builds the app.
- **No other libraries:** only React, TypeScript, Tailwind and Vite, to keep the app small and easy to follow.

### 2. Containerisation (Docker)

- **Two-stage build:** Node installs the exact locked dependencies (`npm ci`) and builds the app; the final image
  contains only nginx and the built files, without Node or `node_modules`.
- **nginx serves the built app:** it's small, fast and designed for serving static files and forwarding requests.
- **nginx settings** (`nginx.conf`):
  - Returns `index.html` for any unknown path, as single-page apps need.
  - Re-checks the backend's address every 10 s through Docker's DNS, so the app keeps working if the backend
    container is recreated.
  - Raises the upload limit to 100 MB and the timeout to 300 s. nginx's defaults (1 MB, 60 s) would reject most
    audio files and cut off long transcriptions.


## Assumptions

- **A modern browser** (recent Chrome, Edge, Firefox or Safari).
- **Single user, small number of transcriptions,** so the full list is loaded at once without pagination.
- **The user is online when the page first loads,** since the fonts are loaded from Google Fonts. Without them, the
  page falls back to system fonts and still works.

## Known limitations

- **No progress percentage:** files are transcribed one at a time on the backend, and the page shows a spinner
  until the whole batch finishes, so a large batch gives no per-file progress.
- **Very long batches can time out:** nginx waits up to 300 s for an upload request. If a batch takes longer, the
  page shows an error (HTTP 504), although the backend keeps processing and saves the transcriptions, which then
  appear in the list.


## Tests

Three unit tests, written with Vitest and React Testing Library, which render the components in a simulated
browser (jsdom) and use them like a user would. To run them, see the [root README](../README.md#running-tests).

| Test (file) | Checks |
|---|---|
| Error messages (`api.test.ts`) | When the backend returns an error, the page shows the backend's own message (e.g. "Model service is unavailable") |
| Upload (`UploadForm.test.tsx`) | Uploading 2 files shows "1 of 2 transcribed", the renamed file ("saved as sample_1.mp3") and the error for the rejected file, then clears the file picker |
| Search (`TranscriptionList.test.tsx`) | Typing in the search box sends no request; clicking **Search** requests matching transcriptions and shows them with a result count |

- **The backend is faked** by replacing the browser's `fetch` with prepared responses, so the tests don't need the
  backend running.
