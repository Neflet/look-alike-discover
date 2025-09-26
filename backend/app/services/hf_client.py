import os, requests

HF_URL = os.getenv("HF_EMBED_ENDPOINT","")
HF_TOKEN = os.getenv("HF_TOKEN","")
TIMEOUT = int(os.getenv("REQUEST_TIMEOUT","15"))

async def hf_embed_1152(image_url: str):
    r = requests.post(
        HF_URL,
        headers={"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "application/json"},
        json={"inputs": {"image_url": image_url}},
        timeout=TIMEOUT,
    )
    if not r.ok:
        return {"error": f"HF {r.status_code}: {r.text}"}
    return r.json()
