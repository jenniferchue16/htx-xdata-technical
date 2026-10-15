FROM python:3.12-slim AS base

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY *.py .

# Test stage: only built when asked for, with `docker build --progress=plain --no-cache-filter test --target test backend`
FROM base AS test
RUN pip install --no-cache-dir pytest httpx2
COPY tests/ tests/
RUN python -m pytest -v tests

# App stage (the default)
FROM base

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
