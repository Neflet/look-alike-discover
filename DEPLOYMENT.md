# SwagAI Deployment Guide

## 🚀 Production Deployment

### Frontend (Vite + React)

**Host on Vercel/Netlify:**
1. Connect your GitHub repository
2. Build command: `npm run build`
3. Output directory: `dist/`
4. Set custom domain: `swagaifashion.com`

**Environment Variables:**
- No environment variables needed for frontend (API calls go to backend)

### Backend (FastAPI)

**Host on Render/Railway/Fly.io:**

1. **Create new service** from GitHub repository
2. **Build command**: `pip install -r backend/requirements.txt`
3. **Start command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port 8000`
4. **Set environment variables**:

```bash
# Supabase
SUPABASE_URL=https://veikyjfcycgpkpwdbksa.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_STORAGE_BUCKET=uploads

# Hugging Face
HF_EMBED_ENDPOINT=https://zduy5mjlbthrdh5e.us-east4.gcp.endpoints.huggingface.cloud/
HF_TOKEN=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

# Admin
ADMIN_KEY=your-secure-admin-key
RATE_LIMIT_RPS=1
RATE_LIMIT_BURST=3
REQUEST_TIMEOUT=15
```

5. **Custom domain**: `api.swagaifashion.com`

### Database Setup

**Run in Supabase SQL Editor:**
```sql
-- Cache table
CREATE TABLE IF NOT EXISTS query_cache (
  image_hash TEXT PRIMARY KEY,
  embedding VECTOR(1152) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
```

### DNS Configuration

**Root domain (swagaifashion.com):**
- A/CNAME record → Frontend hosting provider

**API subdomain (api.swagaifashion.com):**
- CNAME record → Backend hosting provider

### Frontend Configuration

**Update API base URL:**
```typescript
// src/lib/searchByImage.ts
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://api.swagaifashion.com' 
  : 'http://localhost:8000';
```

### CORS Configuration

**Backend CORS settings:**
```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://swagaifashion.com"],  # Production domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## ✅ Acceptance Tests

### 1. Health Check
```bash
curl https://api.swagaifashion.com/api/healthz
# Expected: {"ok": true}
```

### 2. Search Functionality
```bash
curl -X POST https://api.swagaifashion.com/api/search \
  -F "url=https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400"
# Expected: JSON with matches array
```

### 3. Rate Limiting
```bash
# Send 5 rapid requests
for i in {1..5}; do curl -X POST https://api.swagaifashion.com/api/search -F "url=https://example.com/image.jpg"; done
# Expected: Some 429 responses after 3 requests
```

### 4. Cache Performance
```bash
# First request (should be slow)
time curl -X POST https://api.swagaifashion.com/api/search -F "url=https://example.com/image.jpg"

# Second request (should be fast, used_cache: true)
time curl -X POST https://api.swagaifashion.com/api/search -F "url=https://example.com/image.jpg"
```

### 5. Admin Metrics
```bash
curl "https://api.swagaifashion.com/api/admin/metrics?key=YOUR_ADMIN_KEY"
# Expected: JSON with recent events and avg search time
```

### 6. Frontend Integration
1. Visit `https://swagaifashion.com`
2. Upload an image or enter URL
3. Verify results load in <3 seconds
4. Check browser network tab for API calls to `api.swagaifashion.com`

## 🔧 Monitoring

### Health Monitoring
- Set up uptime monitoring for `/api/healthz`
- Monitor response times and error rates

### Performance Metrics
- Check `/api/admin/metrics` regularly
- Monitor average search time
- Track cache hit rates

### Error Tracking
- Set up error logging for 5xx responses
- Monitor rate limit violations
- Track HF endpoint failures

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check frontend domain in CORS settings
   - Verify API base URL in frontend

2. **Rate Limiting Too Strict**
   - Adjust `RATE_LIMIT_RPS` and `RATE_LIMIT_BURST`
   - Check for IP-based blocking

3. **Slow Search Performance**
   - Check cache hit rates
   - Monitor HF endpoint response times
   - Verify database query performance

4. **Image Upload Failures**
   - Check Supabase storage permissions
   - Verify bucket configuration
   - Test with different image formats

### Debug Commands

```bash
# Check backend logs
# (Platform-specific logging commands)

# Test database connection
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  https://veikyjfcycgpkpwdbksa.supabase.co/rest/v1/products?limit=1

# Test HF endpoint
curl -X POST https://zduy5mjlbthrdh5e.us-east4.gcp.endpoints.huggingface.cloud/ \
  -H "Authorization: Bearer $HF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inputs":{"image_url":"https://example.com/image.jpg"}}'
```

## 📊 Performance Targets

- **Search Response Time**: <3 seconds
- **Cache Hit Rate**: >80% for repeated images
- **Uptime**: >99.9%
- **Rate Limit**: 1 RPS, 3 burst
- **Concurrent Users**: 100+ (adjust based on hosting)

## 🔐 Security

- Use strong `ADMIN_KEY` in production
- Enable HTTPS for all endpoints
- Regularly rotate API keys
- Monitor for abuse patterns
- Set up proper CORS origins
- Use environment variables for all secrets
