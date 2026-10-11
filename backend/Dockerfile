FROM python:3.12-slim

WORKDIR /app

# ffmpeg lets librosa decode formats like .m4a
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

# CPU-only torch
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN python -c "from transformers import pipeline; pipeline('automatic-speech-recognition', model='openai/whisper-tiny')"

COPY *.py .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
