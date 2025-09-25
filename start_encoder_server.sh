#!/bin/bash

# Encoder Server Startup Script
# FastAPI server for SigLIP image embeddings

echo "Starting Encoder Server..."

# Check if Python dependencies are installed
echo "Checking dependencies..."
python3 -c "import torch, transformers, fastapi" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing dependencies..."
    pip install -r encoder_server/requirements.txt
fi

# Start the encoder server
echo "Starting encoder server on http://localhost:8001"
cd encoder_server
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
