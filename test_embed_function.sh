#!/bin/bash

# Test script for embed-image Edge Function
# Run this after: supabase functions serve embed-image

echo "Testing embed-image Edge Function locally..."

# Test 1: Multipart FormData with image file
echo "Test 1: Multipart FormData with image file"
curl -X POST "http://localhost:54321/functions/v1/embed-image" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaWt5amZjeWNncGtwd2Ria3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMjA0OTAsImV4cCI6MjA2OTU5NjQ5MH0.xPFTAJVSpVS4hcbnzmILDItpSphcP2aKTPSFo1VbB2s" \
  -F "image=@public/placeholder.svg" \
  -w "\nHTTP Status: %{http_code}\n" \
  | head -c 200

echo -e "\n\n"

# Test 2: JSON with imageUrl
echo "Test 2: JSON with imageUrl"
curl -X POST "http://localhost:54321/functions/v1/embed-image" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaWt5amZjeWNncGtwd2Ria3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMjA0OTAsImV4cCI6MjA2OTU5NjQ5MH0.xPFTAJVSpVS4hcbnzmILDItpSphcP2aKTPSFo1VbB2s" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://picsum.photos/200"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  | head -c 200

echo -e "\n\n"

# Test 3: JSON with base64 (small test image)
echo "Test 3: JSON with base64"
curl -X POST "http://localhost:54321/functions/v1/embed-image" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaWt5amZjeWNncGtwd2Ria3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMjA0OTAsImV4cCI6MjA2OTU5NjQ5MH0.xPFTAJVSpVS4hcbnzmILDItpSphcP2aKTPSFo1VbB2s" \
  -H "Content-Type: application/json" \
  -d '{"base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "imageType": "image/png"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  | head -c 200

echo -e "\n\nTest completed!"
