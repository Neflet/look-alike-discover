FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY server.py /app/server.py
RUN pip install --no-cache-dir fastapi uvicorn pillow numpy requests transformers && \
    pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch
EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]

