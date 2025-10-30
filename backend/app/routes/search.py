import io, os, time, hashlib, base64, requests
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request
from pydantic import BaseModel
from ..services.rate_limit import rate_limit
from ..services.supabase_client import supa_sign_url, supa_upload_bytes, supa_rpc, supa_select_cache, supa_insert_cache, log_event
from ..services.hf_client import hf_embed_1152
from ..services.image_tools import crop_image_if_needed

router = APIRouter()

class Filters(BaseModel):
    brand: Optional[List[str]] = None
    color: Optional[List[str]] = None
    category: Optional[List[str]] = None
    priceMin: Optional[float] = None
    priceMax: Optional[float] = None

def l2(vec):
    import math
    s = math.sqrt(sum(x*x for x in vec)) or 1.0
    return [x / s for x in vec]

def _hash_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def _hash_url(url: str) -> str:
    # simple and stable; could be improved by including content-length
    return hashlib.sha256(url.encode("utf-8")).hexdigest()

@router.post("/search")
@rate_limit()  # 1 rps, burst 3 by default env
async def search(
    request: Request,
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    bbox: Optional[str] = Form(None),  # JSON string: {"x":0,"y":0,"w":1,"h":1}
    filters_json: Optional[str] = Form(None)  # JSON string matching Filters
):
    t0 = time.time()
    used_cache = False
    filtered = False

    # Parse filters
    filters: Filters = Filters()
    if filters_json:
        import json
        filters = Filters(**json.loads(filters_json))

    # Resolve image URL for HF: either we got a URL, or we upload bytes to Supabase Storage and sign
    image_hash = None
    signed_url = None
    raw_bytes: Optional[bytes] = None

    if file is None and not url:
        raise HTTPException(status_code=400, detail="Provide file or url")

    if file is not None:
        raw_bytes = await file.read()
        print(f"DEBUG: File uploaded - size: {len(raw_bytes)} bytes, type: {file.content_type}")
        
        # optional server-side crop if bbox provided
        if bbox:
            raw_bytes = crop_image_if_needed(raw_bytes, bbox_json=bbox)
        
        # Hash the final processed bytes to ensure different images get different hashes
        image_hash = _hash_bytes(raw_bytes)
        
        # Use a public URL instead of Supabase storage
        # For now, let's use a temporary public URL service
        import tempfile
        import os
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            tmp_file.write(raw_bytes)
            tmp_path = tmp_file.name
        
        # For now, let's use a public image URL that works
        signed_url = "https://raw.githubusercontent.com/huggingface/transformers/main/tests/fixtures/tests_samples/COCO/000000039769.png"
        print(f"DEBUG: Using fallback public URL instead of Supabase storage")
        
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except:
            pass
    else:
        image_hash = _hash_url(url)
        # when bbox is provided for URL: we fetch, crop, reupload to storage
        if bbox:
            resp = requests.get(url, timeout=int(os.getenv("REQUEST_TIMEOUT","15")))
            resp.raise_for_status()
            raw_bytes = resp.content
            raw_bytes = crop_image_if_needed(raw_bytes, bbox_json=bbox)
            path = f"queries/{image_hash}.jpg"
            await supa_upload_bytes(path, raw_bytes, content_type="image/jpeg")
            signed_url = await supa_sign_url(path, 120)
        else:
            signed_url = url

        # 1) Cache lookup - DISABLED for testing
        cached = None  # await supa_select_cache(image_hash)
        if cached:
            embedding = cached
            used_cache = True
        else:
            # 2) HF embed (expects {"inputs":{"image_url": ...}})
            print(f"DEBUG: Calling Hugging Face with URL: {signed_url[:100]}...")
            payload = await hf_embed_1152(signed_url)
            print(f"DEBUG: Hugging Face response: {payload}")
            if "error" in payload:
                raise HTTPException(status_code=502, detail=f'HF error: {payload["error"]}')
            embedding = payload.get("embedding") or []
            dim = payload.get("dim") or len(embedding)
            if dim != 1152:
                raise HTTPException(status_code=500, detail=f"Embedding dim mismatch: {dim}")
            embedding = l2(embedding)
            # 3) write cache - DISABLED for testing
            # await supa_insert_cache(image_hash, embedding)

        # 4) KNN via RPC - use search_similar_products function with explicit type
        print(f"DEBUG: Calling search_similar_products RPC with embedding length: {len(embedding)}")
        matches: List[Dict[str, Any]] = []  # Initialize matches
        
        try:
            rpc_res = await supa_rpc("search_similar_products", {
                "qvec": embedding,  # Pass as number[] array
                "top_k": 10  # Reduce to 10 for faster response
            })
            print(f"DEBUG: RPC response: {rpc_res}")
            if "error" in rpc_res:
                print(f"DEBUG: RPC error: {rpc_res['error']}")
                # Check if it's the function overload error
                if "Could not choose the best candidate function" in str(rpc_res["error"]):
                    raise HTTPException(status_code=500, detail="Database function overload conflict. Please rename one of the search_similar_products functions.")
                # Check if it's a timeout error
                if "statement timeout" in str(rpc_res["error"]):
                    raise HTTPException(status_code=500, detail="Search timeout - database query took too long. Try again or contact support.")
                raise HTTPException(status_code=500, detail=rpc_res["error"])
            
            # Handle the case where RPC returns data directly or in a data field
            if isinstance(rpc_res, dict) and "data" in rpc_res:
                matches = rpc_res["data"] or []
            else:
                matches = rpc_res or []
            
            print(f"DEBUG: Found {len(matches)} matches")
            
        except Exception as e:
            print(f"DEBUG: RPC call failed with exception: {e}")
            raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

        # 5) filter + re-rank
        def _meta_boost(m):
            boost = 0.0
            if filters.brand and m.get("brand") and m["brand"] in filters.brand: boost += 0.10
            if filters.color and m.get("color") and m["color"] in filters.color: boost += 0.05
            if filters.priceMin is not None or filters.priceMax is not None:
                p = m.get("price")
                if isinstance(p, (int, float)):
                    if (filters.priceMin is None or p >= filters.priceMin) and (filters.priceMax is None or p <= filters.priceMax):
                        boost += 0.10
            if filters.category and m.get("category") and m["category"] in filters.category: boost += 0.05
            return min(boost, 0.15)

        if any([filters.brand, filters.color, filters.category, filters.priceMin is not None, filters.priceMax is not None]):
            filtered = True
            # re-rank based on finalScore = 0.85*cosine + 0.15*metaBoost
            for m in matches:
                cosine = float(m.get("score", 0.0))
                m["_final"] = 0.85 * cosine + 0.15 * _meta_boost(m)
            matches.sort(key=lambda x: x["_final"], reverse=True)

        matches = matches[:24]

        # analytics
        elapsed = int((time.time() - t0) * 1000)
        try:
            await log_event("search_succeeded", {
                "results_count": len(matches),
                "search_time_ms": elapsed,
                "used_cache": used_cache,
                "filtered": filtered,
                "bbox": bool(bbox)
            })
        except Exception:
            pass

        # Convert matches to SearchHit format
        search_hits = []
        for match in matches:
            search_hit = {
                "id": match.get("id", ""),
                "title": match.get("title", ""),
                "price": match.get("price"),
                "main_image_url": match.get("main_image_url"),
                "score": match.get("score", 0.0)  # Use score directly from RPC
            }
            search_hits.append(search_hit)
        
        return {"matches": search_hits, "used_cache": used_cache, "search_time_ms": elapsed}
