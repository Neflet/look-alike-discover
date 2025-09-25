# SigLIP Embedding Service

Minimal FastAPI service that generates 1152-dimensional embeddings using google/siglip-so400m-patch14-384.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run service
python main.py
# Service runs on http://localhost:8001
```

## API Endpoints

- `POST /embed` - Upload image, get embedding
- `GET /healthz` - Health check

## Environment Variables

- `PORT` - Server port (default: 8001)

## Usage Example

```bash
# Test embedding
curl -X POST http://localhost:8001/embed \
  -F "image=@your_image.jpg"

# Health check
curl http://localhost:8001/healthz
```

## Production Notes

- First request has cold-start delay (~10-30s)
- GPU recommended for faster inference
- Model weights cached after first load
- 5MB file size limit enforced