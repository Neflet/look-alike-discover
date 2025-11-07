import base64, io, json, os
from PIL import Image
import torch
from transformers import AutoProcessor, AutoModel

MODEL_ID = os.getenv("MODEL_ID", "google/siglip-so400m-patch14-384")
device = "cuda" if torch.cuda.is_available() else "cpu"

processor = AutoProcessor.from_pretrained(MODEL_ID)
model = AutoModel.from_pretrained(MODEL_ID).to(device)
model.eval()

def _load_image(payload):
    # accept base64 string or URL
    if isinstance(payload, str) and payload.startswith("http"):
        import requests
        r = requests.get(payload, timeout=20)
        r.raise_for_status()
        return Image.open(io.BytesIO(r.content)).convert("RGB")
    
    if isinstance(payload, str):
        # base64
        b = base64.b64decode(payload)
        return Image.open(io.BytesIO(b)).convert("RGB")
    
    raise ValueError("inputs must be image URL or base64 string")

def predict(inputs: dict):
    """
    Expects JSON: {"inputs": "<image_url_or_base64>"}
    Returns: {"embedding": [float, ...]}
    """
    img = _load_image(inputs.get("inputs"))
    batch = processor(images=img, return_tensors="pt").to(device)
    
    with torch.no_grad():
        feats = model.get_image_features(**batch)
        feats = torch.nn.functional.normalize(feats, dim=-1)
    
    emb = feats[0].detach().cpu().tolist()
    return {"embedding": emb}

