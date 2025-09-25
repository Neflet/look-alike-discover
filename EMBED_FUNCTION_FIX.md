# Embed-Image Edge Function - Fixed

## Problem Solved
The `embed-image` Edge Function was crashing with "Maximum call stack size exceeded" due to a **syntax error** in the JSON.stringify call (line 53). This has been fixed.

## Changes Made

### 1. Fixed Syntax Error
**Removed:** Malformed `JSON.stringify` call that was causing parsing errors
**Fixed:** Proper JSON response formatting

### 2. Enhanced Function Capabilities
- ✅ **Multipart FormData support**: Accept `image` file uploads
- ✅ **JSON support**: Accept `imageUrl` or `base64` image data
- ✅ **Environment validation**: Check for `HUGGING_FACE_TOKEN` or `OPENAI_API_KEY`
- ✅ **Provider flexibility**: Support both Hugging Face and OpenAI
- ✅ **Comprehensive logging**: Log content type, payload keys, provider responses
- ✅ **Error handling**: Clear error messages for missing config/invalid requests

### 3. Response Format
```json
{
  "vector": [0.1, -0.2, 0.3, ...],
  "dimensions": 512,
  "provider": "huggingface"
}
```

## Setup Commands

### 1. Set Environment Secrets
```bash
# Option A: Hugging Face (recommended for images)
supabase secrets set HUGGING_FACE_TOKEN="hf_your_actual_token" --project-ref veikyjfcycgpkpwdbksa

# Option B: OpenAI (alternative)
supabase secrets set OPENAI_API_KEY="sk-your_actual_key" --project-ref veikyjfcycgpkpwdbksa
```

### 2. Deploy Function
```bash
supabase functions deploy embed-image --project-ref veikyjfcycgpkpwdbksa
```

### 3. Test Locally (Optional)
```bash
# Start local development server
supabase functions serve embed-image

# Run tests in another terminal
./test_embed_function.sh
```

## Production Tests

### Test 1: Multipart FormData
```bash
curl -X POST "https://veikyjfcycgpkpwdbksa.supabase.co/functions/v1/embed-image" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaWt5amZjeWNncGtwd2Ria3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMjA0OTAsImV4cCI6MjA2OTU5NjQ5MH0.xPFTAJVSpVS4hcbnzmILDItpSphcP2aKTPSFo1VbB2s" \
  -F "image=@public/placeholder.svg"
```

### Test 2: JSON with imageUrl
```bash
curl -X POST "https://veikyjfcycgpkpwdbksa.supabase.co/functions/v1/embed-image" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaWt5amZjeWNncGtwd2Ria3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMjA0OTAsImV4cCI6MjA2OTU5NjQ5MH0.xPFTAJVSpVS4hcbnzmILDItpSphcP2aKTPSFo1VbB2s" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://picsum.photos/200"}'
```

## Client Usage

### Frontend (Supabase Client)
```javascript
// Method 1: FormData
const formData = new FormData();
formData.append('image', imageFile);
const { data } = await supabase.functions.invoke('embed-image', { body: formData });

// Method 2: JSON
const { data } = await supabase.functions.invoke('embed-image', { 
  body: { imageUrl: 'https://example.com/image.jpg' } 
});
```

### Direct Fetch
```javascript
const response = await fetch('https://veikyjfcycgpkpwdbksa.supabase.co/functions/v1/embed-image', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-anon-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ imageUrl: 'https://example.com/image.jpg' })
});
const { vector } = await response.json();
```

## Files Changed
- `supabase/functions/embed-image/index.ts` - Complete rewrite with proper syntax and enhanced features
- `test_embed_function.sh` - New test script for local development
- `EMBED_FUNCTION_FIX.md` - This documentation

## Verification
- ✅ No recursive calls to embed-image
- ✅ Proper error handling and logging
- ✅ Support for both multipart and JSON requests
- ✅ Environment variable validation
- ✅ CORS headers included
- ✅ Web/Deno APIs only (no Node.js dependencies)
