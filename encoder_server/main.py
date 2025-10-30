# encoder_server/main.py
import io
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import torch
from transformers import AutoImageProcessor, SiglipVisionModel

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

MODEL_NAME = "google/siglip-so400m-patch14-384"
device = "cuda" if torch.cuda.is_available() else "cpu"
proc = AutoImageProcessor.from_pretrained(MODEL_NAME)
model = SiglipVisionModel.from_pretrained(MODEL_NAME).to(device).eval()

@app.post("/embed")
async def embed(file: UploadFile = File(...)):
    try:
        img = Image.open(io.BytesIO(await file.read())).convert("RGB")
        inputs = proc(images=[img], return_tensors="pt").to(device)
        with torch.no_grad():
            pooled = model(**inputs).pooler_output
            pooled = torch.nn.functional.normalize(pooled, dim=1)
        vec = pooled.squeeze(0).cpu().tolist()  # length 1152
        return {
            "embedding": vec, 
            "dim": len(vec),
            "dims": len(vec),  # backward compatibility
            "model": MODEL_NAME
        }
    except Exception as e:
        print(f"[encoder] error: {e}")
        raise
