#!/bin/bash
# Test HuggingFace Endpoint
# Usage: ./test_hf_endpoint.sh <HF_ENDPOINT_URL> <HF_API_TOKEN>

HF_ENDPOINT_URL="${1:-$HF_ENDPOINT_URL}"
HF_API_TOKEN="${2:-$HF_API_TOKEN}"

if [ -z "$HF_ENDPOINT_URL" ] || [ -z "$HF_API_TOKEN" ]; then
  echo "Usage: $0 <HF_ENDPOINT_URL> <HF_API_TOKEN>"
  echo "Or set HF_ENDPOINT_URL and HF_API_TOKEN environment variables"
  exit 1
fi

echo "Testing HuggingFace Endpoint..."
echo "URL: $HF_ENDPOINT_URL"
echo ""

curl -X POST "$HF_ENDPOINT_URL" \
  -H "Authorization: Bearer $HF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inputs":"https://images.unsplash.com/photo-1520975922322-5f1f117f3f35?w=512"}' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | python3 -m json.tool 2>/dev/null || cat

echo ""

