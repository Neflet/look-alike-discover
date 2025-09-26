#!/bin/bash
set -e

echo "🧪 Testing new modular backend..."

# Test health endpoint
echo "Testing /api/healthz..."
curl -s http://localhost:8000/api/healthz | python3 -m json.tool

echo ""
echo "Testing /api/search with URL..."
curl -s -X POST "http://localhost:8000/api/search" \
  -F "url=https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400" | \
  python3 -m json.tool | head -20

echo ""
echo "✅ Backend tests completed!"
