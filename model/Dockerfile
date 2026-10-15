FROM python:3.12-slim

WORKDIR /app

# CPU-only torch
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir --upgrade setuptools wheel

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY config.py .
RUN python -c "from transformers import pipeline; from config import MODEL_NAME; pipeline('automatic-speech-recognition', model=MODEL_NAME)"

COPY *.py .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
