#!/usr/bin/env bash
set -euo pipefail

API="${1:-http://localhost:8000/api/search}"
IMG="${2:-https://raw.githubusercontent.com/huggingface/transformers/main/tests/fixtures/tests_samples/COCO/000000039769.png}"

echo "POST $API with $IMG"
curl -s -X POST "$API" \
  -F "url=$IMG" | python3 -m json.tool
