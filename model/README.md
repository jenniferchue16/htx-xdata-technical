# Model service

A separate FastAPI service that turns audio into text with OpenAI's Whisper (`openai/whisper-tiny`).
It is called by the [backend](../backend/README.md) over Docker's internal network. For setup instructions, see the [root README](../README.md).

## Files

| File | Purpose |
|---|---|
| `main.py` | Service endpoints |
| `transcriber.py` | Audio preprocessing and the Whisper pipeline |
| `config.py` | Model name (`openai/whisper-tiny`), shared by `transcriber.py` and the Dockerfile |


## API reference

### `GET /health`
Returns `{"status": "ok"}`. It only responds once the model has loaded, which Docker uses to decide when the
backend can start.

### `POST /transcribe`
Accepts **one** audio file (multipart form field `file`) and returns its transcription.
```json
{"transcription": "Hello, this is a test."}
```
If the file can't be decoded or transcribed, it returns an error status, which the backend reports to the user as
`Could not transcribe file`.


## Design decisions

### 1. A separate service
- **Separation of concerns:** the backend handles requests and data; this service only does inference.
- **Independent of the backend:** the model can be changed, scaled or moved to a GPU machine without touching the
  backend.
- **Stateless:** it keeps nothing after a request. The backend stores the uploads and transcriptions.

### 2. Whisper integration
- **CPU-only PyTorch:** `whisper-tiny` (39M parameters) runs comfortably on a CPU. The default Linux PyTorch
  build bundles about 2 GB of NVIDIA GPU libraries that would go unused.
- **The model is loaded once,** when the service starts, not per request.
- **Sync (`def`) endpoint:** inference is CPU-bound and blocking. FastAPI runs `def` endpoints in a worker thread
  pool, so one transcription doesn't freeze the service.
- **Audio preprocessing** (`transcriber.py`), using librosa:
  - **Resample to 16 kHz.** Whisper was trained only on 16 kHz audio (Whisper paper, section 2.2; the model's
    `preprocessor_config.json` has `"sampling_rate": 16000`). Other rates would garble the transcription.
  - **Convert to mono.** Whisper expects a single channel.
  - **Normalise the volume to -1..1** (peak normalisation), so quiet recordings work as well as loud ones.
  - **Log-mel spectrogram:** computed by Whisper's own feature extractor inside the `transformers` pipeline, so it
    matches how the model was trained.
- **`chunk_length_s=30`:** Whisper processes 30 seconds of audio at a time. Without chunking, longer audio would be
  cut off at 30 s. The pipeline splits long audio into 30 s chunks and joins the text.
- **English is forced** (`language="english"`, `task="transcribe"`): `whisper-tiny` is multilingual and detects the
  language automatically, but its detection is unreliable. In testing, English speech was transcribed as Malay.

### 3. Containerisation (Docker)
- **Image contents:**
  - ffmpeg is installed for `.m4a` support.
  - CPU-only torch is installed.
  - The Whisper model is downloaded at **build time**, so the container starts fast and works offline.
- **Health check:** Docker checks `/health` every 5 s during startup, then every 5 minutes.
- **The port is not published:** only the backend can reach this service (`http://model:8001`). Uploads can't
  bypass the backend's checks, and the service that decodes untrusted audio with ffmpeg isn't exposed.


## Assumptions

- **Audio is in English.** The language is forced to English; other languages would be transcribed poorly or
  translated.
- **Models are served as separate services.** This service is designed to mimic a setup like HTX's Ngine
  platform, assuming AI models are hosted as standalone services that applications call through APIs.
- **Inference optimisation is out of scope.** The service transcribes one file per request. A production setup
  would consider the inference infrastructure, e.g. batching, GPU workers, or multiple replicas behind a load
  balancer.

## Known limitations

- **`chunk_length_s` is marked "experimental" by `transformers`** for Whisper. Words at chunk boundaries can be
  inaccurate for audio over 30 s. Whisper's own long-form method (`return_timestamps=True`) is an alternative.
