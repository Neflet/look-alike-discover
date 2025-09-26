import json, io
from PIL import Image

def crop_image_if_needed(raw_bytes: bytes, bbox_json: str) -> bytes:
    try:
        box = json.loads(bbox_json)  # {"x":0,"y":0,"w":1,"h":1}
        x, y, w, h = float(box["x"]), float(box["y"]), float(box["w"]), float(box["h"])
        img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        W, H = img.size
        left   = max(0, min(W, int(x * W)))
        top    = max(0, min(H, int(y * H)))
        right  = max(0, min(W, int((x + w) * W)))
        bottom = max(0, min(H, int((y + h) * H)))
        if right - left <= 2 or bottom - top <= 2:
            return raw_bytes
        cropped = img.crop((left, top, right, bottom))
        out = io.BytesIO()
        cropped.save(out, format="JPEG", quality=92)
        return out.getvalue()
    except Exception:
        return raw_bytes
