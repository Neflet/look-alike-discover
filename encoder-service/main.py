#!/usr/bin/env python3
"""
Minimal SigLIP embedding service
POST /embed - accepts image, returns 1152-dim L2-normalized vector
GET /healthz - health check
"""

import os
import io
import logging
import time
from typing import List
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import torch
import torch.nn.functional as F
from transformers import AutoImageProcessor, AutoModel
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SigLIP Embedding Service", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model variables
processor = None
model = None
model_loaded = False

# Configuration
MODEL_NAME = "google/siglip-so400m-patch14-384"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}

def load_model():
    """Load SigLIP model and processor"""
    global processor, model, model_loaded
    
    if model_loaded:
        return
    
    try:
        logger.info(f"Loading model: {MODEL_NAME}")
        start_time = time.time()
        
        processor = AutoImageProcessor.from_pretrained(MODEL_NAME)
        model = AutoModel.from_pretrained(MODEL_NAME)
        
        # Move to GPU if available
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model = model.to(device)
        model.eval()
        
        load_time = time.time() - start_time
        logger.info(f"Model loaded successfully in {load_time:.2f}s on {device}")
        model_loaded = True
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise RuntimeError(f"Model loading failed: {e}")

def validate_image(file: UploadFile) -> None:
    """Validate uploaded image file"""
    # Check file size
    if hasattr(file, 'size') and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Check MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}"
        )

def process_image(image_bytes: bytes) -> List[float]:
    """Process image and return L2-normalized embedding"""
    try:
        # Load and validate image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Process image
        inputs = processor(images=image, return_tensors="pt")
        
        # Move to same device as model
        device = next(model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        # Generate embedding
        with torch.no_grad():
            outputs = model.get_image_features(**inputs)
            
        # L2 normalize
        embedding = F.normalize(outputs, p=2, dim=1)
        
        # Convert to list
        embedding_list = embedding.cpu().numpy().flatten().tolist()
        
        # Verify dimensions
        if len(embedding_list) != 1152:
            raise ValueError(f"Expected 1152 dimensions, got {len(embedding_list)}")
        
        return embedding_list
        
    except Exception as e:
        logger.error(f"Image processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    try:
        load_model()
    except Exception as e:
        logger.error(f"Failed to load model on startup: {e}")
        # Don't fail startup, allow cold-start loading

@app.get("/healthz")
async def health_check():
    """Health check endpoint"""
    global model_loaded
    
    return {
        "status": "healthy" if model_loaded else "loading",
        "model_loaded": model_loaded,
        "model_name": MODEL_NAME,
        "device": "cuda" if torch.cuda.is_available() else "cpu"
    }

@app.post("/embed")
async def embed_image(image: UploadFile = File(...)):
    """
    Generate L2-normalized embedding for uploaded image
    Returns: {"embedding": [1152 float values]}
    """
    request_start = time.time()
    
    # Validate file
    validate_image(image)
    
    # Handle cold start
    if not model_loaded:
        logger.info("Cold start: loading model...")
        try:
            load_model()
        except Exception as e:
            raise HTTPException(status_code=503, detail="Model loading failed")
    
    try:
        # Read image bytes
        image_bytes = await image.read()
        
        # Log request
        logger.info(f"Processing image: {image.filename}, size: {len(image_bytes)} bytes")
        
        # Process image
        embedding = process_image(image_bytes)
        
        process_time = time.time() - request_start
        logger.info(f"Embedding generated in {process_time:.3f}s")
        
        return {"embedding": embedding}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)