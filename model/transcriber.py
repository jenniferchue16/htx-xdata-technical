import librosa
from transformers import pipeline

from config import MODEL_NAME

# Load Whisper once at startup. chunk_length_s splits audio longer than Whisper's 30s window.
speech_recognizer = pipeline("automatic-speech-recognition", model=MODEL_NAME, chunk_length_s=30)


def transcribe(audio_path):
    # Decode file, mixes it to mono and resample to 16 kHz
    audio, sample_rate = librosa.load(audio_path, sr=16000, mono=True)
    # Scales volume between -1 and 1
    audio = librosa.util.normalize(audio)
    # Force English transcription since model is multilingual
    return speech_recognizer(
        {"raw": audio, "sampling_rate": sample_rate},
        generate_kwargs={"language": "english", "task": "transcribe"},
    )["text"].strip()
