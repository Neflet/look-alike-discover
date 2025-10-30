import os, requests

HF_URL = os.getenv("HF_EMBED_ENDPOINT","").rstrip("/")
HF_TOKEN = os.getenv("HF_TOKEN","")
TIMEOUT = int(os.getenv("REQUEST_TIMEOUT","15"))

async def hf_embed_1152(image_url: str):
    # Handle both regular URLs and base64 data URLs
    if image_url.startswith("data:"):
        # Base64 data URL - use image_url field for both
        payload = {"inputs": {"image_url": image_url}}
    else:
        # Regular URL
        payload = {"inputs": {"image_url": image_url}}
    
    r = requests.post(
        HF_URL,
        headers={"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "application/json"},
        json=payload,
        timeout=TIMEOUT,
    )
    if not r.ok:
        return {"error": f"HF {r.status_code}: {r.text}"}
    return r.json()
