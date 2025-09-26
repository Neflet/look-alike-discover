# SwagAI Backend

Production-ready FastAPI backend for image similarity search.

## Features

- **Modular Architecture**: Clean separation of routes, services, and utilities
- **Rate Limiting**: Configurable RPS and burst limits
- **Caching**: Embedding cache for improved performance
- **Filters**: Brand, color, category, and price filtering with re-ranking
- **Analytics**: Event tracking and metrics
- **Image Processing**: Optional bounding box cropping
- **Health Checks**: `/api/healthz` endpoint

## Quick Start

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set environment variables**:
   ```bash
   cp env.template .env
   # Edit .env with your actual values
   ```

3. **Run the server**:
   ```bash
   python start.py
   ```

## Environment Variables

See `env.template` for all required variables:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access
- `HF_EMBED_ENDPOINT`: Hugging Face inference endpoint
- `HF_TOKEN`: Hugging Face API token
- `ADMIN_KEY`: Admin key for metrics endpoint
- `RATE_LIMIT_RPS`: Requests per second limit
- `RATE_LIMIT_BURST`: Burst limit for rate limiting

## API Endpoints

### Search
- `POST /api/search` - Image similarity search
  - Supports file upload or URL
  - Optional filters and bounding box
  - Returns top 24 matches with scores

### Health
- `GET /api/healthz` - Health check

### Metrics
- `GET /api/admin/metrics?key=ADMIN_KEY` - Analytics and performance metrics

## Database Schema

The backend requires these tables:
- `query_cache` - Embedding cache
- `analytics_events` - Event tracking
- `products` - Product catalog with embeddings

Run the migration: `supabase/migrations/20250125000000_add_cache_and_analytics.sql`

## Production Deployment

1. **Build and deploy**:
   ```bash
   # For Render/Railway/Fly.io
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

2. **Set production environment variables**

3. **Configure CORS** for your frontend domain

4. **Set up monitoring** for the `/api/healthz` endpoint
