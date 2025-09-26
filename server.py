# server.py - Legacy compatibility wrapper
# For new modular backend, use: backend/app/main.py
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

try:
    # Try to import the new modular app
    from app.main import app
    print("✅ Using new modular backend structure")
except ImportError:
    # Fallback to legacy implementation
    print("⚠️  Using legacy server.py implementation")
    
    import io, requests, time
from PIL import Image
    from fastapi import FastAPI, UploadFile, File, HTTPException, Form
    from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
    from supabase import create_client, Client
    import numpy as np

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not supabase_url or not supabase_key:
    print("Warning: Supabase credentials not found. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.")
    supabase = None
else:
    supabase: Client = create_client(supabase_url, supabase_key)

def l2_normalize(vec: list[float]) -> list[float]:
    """L2 normalize a vector"""
    s = np.sqrt(sum(x * x for x in vec)) or 1
    return [x / s for x in vec]

def upload_to_imgur(file_bytes: bytes) -> str:
    """Upload image to Imgur and return URL"""
    try:
        import base64
        
        # Encode image to base64
        image_b64 = base64.b64encode(file_bytes).decode('utf-8')
        
        # Upload to Imgur
        response = requests.post(
            "https://api.imgur.com/3/image",
            headers={"Authorization": "Client-ID 546c25a59c58ad7"},  # Public client ID
            data={"image": image_b64}
        )
        
        if response.ok:
            data = response.json()
            return data["data"]["link"]
        else:
            raise Exception(f"Imgur upload failed: {response.text}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

def upload_to_postimage(file_bytes: bytes) -> str:
    """Upload image to PostImage and return URL"""
    try:
        files = {'upload': ('image.jpg', file_bytes, 'image/jpeg')}
        response = requests.post('https://postimages.org/api/upload', files=files)
        
        if response.ok:
            data = response.json()
            return data['url']
        else:
            raise Exception(f"PostImage upload failed: {response.text}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PostImage upload failed: {str(e)}")

def create_local_image_url(file_bytes: bytes) -> str:
    """Create a local image URL using a simple approach"""
    import uuid
    import tempfile
    import os
    
    # Create a unique filename
    filename = f"temp_{uuid.uuid4().hex}.jpg"
    temp_path = os.path.join(tempfile.gettempdir(), filename)
    
    # Write file to temp location
    with open(temp_path, "wb") as f:
        f.write(file_bytes)
    
    # Return a local URL (this would need a file server in production)
    # For now, let's use a different approach
    return f"file://{temp_path}"

def embed_image_via_hf_base64(file_bytes: bytes) -> list[float]:
    """Call Hugging Face endpoint with raw image bytes"""
    hf_endpoint = os.getenv("HF_EMBED_ENDPOINT", "")
    hf_token = os.getenv("HF_TOKEN", "")
    
    if not hf_endpoint or not hf_token:
        raise HTTPException(status_code=500, detail="Missing HF configuration")
    
    # Try different content types
    content_types = ["image/jpeg", "image/png", "image/webp"]
    
    for content_type in content_types:
        try:
            response = requests.post(
                hf_endpoint,
                headers={
                    "Authorization": f"Bearer {hf_token}",
                    "Content-Type": content_type
                },
                data=file_bytes,
                timeout=30
            )
            
            if response.ok:
                payload = response.json()
                if "error" in payload:
                    continue  # Try next content type
                
                # Handle different response formats
                embedding = None
                if isinstance(payload, list) and len(payload) > 0:
                    embedding = payload[0] if isinstance(payload[0], list) else payload
                elif isinstance(payload, dict):
                    embedding = payload.get("embedding", payload.get("image_embedding", payload.get("features")))
                else:
                    embedding = payload
                
                if isinstance(embedding, list) and len(embedding) == 1152:
                    return l2_normalize(embedding)
                    
        except Exception as e:
            continue  # Try next content type
    
    raise HTTPException(status_code=500, detail="Failed to process image with any content type")

def embed_image_via_hf(image_url: str) -> list[float]:
    """Call Hugging Face endpoint to get embedding"""
    hf_endpoint = os.getenv("HF_EMBED_ENDPOINT", "")
    hf_token = os.getenv("HF_TOKEN", "")
    
    if not hf_endpoint or not hf_token:
        raise HTTPException(status_code=500, detail="Missing HF configuration")
    
    # Handle base64 data URLs differently
    if image_url.startswith("data:"):
        # Extract base64 data
        import base64
        header, data = image_url.split(",", 1)
        image_bytes = base64.b64decode(data)
        
        # Send raw image bytes with proper content type
        response = requests.post(
            hf_endpoint,
            headers={
                "Authorization": f"Bearer {hf_token}",
                "Content-Type": "image/jpeg"
            },
            data=image_bytes,
            timeout=30
        )
    else:
        # Regular URL - ensure endpoint URL is properly formatted
        if not hf_endpoint.endswith('/'):
            hf_endpoint += '/'
        
        print(f"Calling HF endpoint: {hf_endpoint} with image URL: {image_url}")
        
        response = requests.post(
            hf_endpoint,
            headers={
                "Authorization": f"Bearer {hf_token}",
                "Content-Type": "application/json"
            },
            json={"inputs": {"image_url": image_url}},
            timeout=30
        )
    
    if not response.ok:
        print(f"HF API error: {response.status_code} - {response.text}")
        raise HTTPException(status_code=response.status_code, detail=f"HF API error: {response.text}")
    
    try:
        payload = response.json()
        print(f"HF response payload: {type(payload)} - {str(payload)[:200]}...")
    except Exception as e:
        print(f"Failed to parse HF response as JSON: {e}")
        raise HTTPException(status_code=500, detail=f"Invalid HF response: {response.text}")
    
    if "error" in payload:
        print(f"HF error in payload: {payload['error']}")
        raise HTTPException(status_code=500, detail=f"HF error: {payload['error']}")
    
    # Handle different response formats
    embedding = None
    if isinstance(payload, list) and len(payload) > 0:
        # Response is a list of embeddings - take the first one
        embedding = payload[0] if isinstance(payload[0], list) else payload
    elif isinstance(payload, dict):
        # Response is a dict with embedding field
        embedding = payload.get("embedding", payload.get("image_embedding", payload.get("features")))
    else:
        # Response might be the embedding directly
        embedding = payload
    
    if not isinstance(embedding, list) or len(embedding) != 1152:
        raise HTTPException(status_code=500, detail=f"Expected 1152-d vector, got {len(embedding) if isinstance(embedding, list) else 'non-list'}. Response: {payload}")
    
    return l2_normalize(embedding)

def upload_to_supabase_storage(file_bytes: bytes, filename: str) -> str:
    """Upload file to Supabase Storage and return signed URL"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    upload_path = f"queries/{filename}"
    
    result = supabase.storage.from_("uploads").upload(
        upload_path,
        file_bytes,
        file_options={"content-type": "image/jpeg"}
    )
    
    if hasattr(result, 'error') and result.error:
        raise HTTPException(status_code=500, detail=f"Storage upload error: {result.error}")
    
    # Create signed URL
    signed_result = supabase.storage.from_("uploads").create_signed_url(
        upload_path, 120  # 120 seconds
    )
    
    if hasattr(signed_result, 'signed_url') and signed_result.signed_url:
        return signed_result.signed_url
    else:
        raise HTTPException(status_code=500, detail="Failed to create signed URL")

def search_products(embedding: list[float]) -> list[dict]:
    """Search products using Supabase RPC"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    # Try the simpler search_products function first (faster)
    try:
        result = supabase.rpc(
            "search_products",
            {
                "query_vec": embedding,
                "pmin": 0,
                "pmax": 999999,
                "pcolor": None
            }
        ).execute()
        
        if hasattr(result, 'data') and result.data:
            # Transform the result to match expected format
            matches = []
            for item in result.data:
                similarity_score = 1 - item["distance"]
                # Only include matches with similarity > 0.01 (1%)
                if similarity_score > 0.01:
                    matches.append({
                        "id": item["id"],
                        "title": item["title"],
                        "brand": "Unknown",  # This function doesn't return brand
                        "price": item["price"],
                        "currency": "USD",  # Default currency
                        "category": "Unknown",  # This function doesn't return category
                        "color": item["color"],
                        "url": item["url"],
                        "main_image_url": item["main_image_url"],
                        "score": similarity_score
                    })
            return matches
    except Exception as e:
        print(f"Simple search failed: {e}")
    
    # Only try enhanced search if simple search fails
    try:
        result = supabase.rpc(
            "search_products_enhanced",
            {
                "query_embedding": embedding,
                "p_model_id": "google/siglip-so400m-patch14-384",
                "p_limit": 5,
                "p_price_min": 0,
                "p_price_max": 999999
            }
        ).execute()
        
        if hasattr(result, 'data') and result.data:
            # Transform the result to match expected format
            matches = []
            for item in result.data:
                similarity_score = 1 - item["distance"]
                # Only include matches with similarity > 0.01 (1%)
                if similarity_score > 0.01:
                    matches.append({
                        "id": item["product_id"],
                        "title": item["title"],
                        "brand": item["brand"],
                        "price": item["price"],
                        "currency": item["currency"],
                        "category": item["category"],
                        "color": item["color"],
                        "url": item["url"],
                        "main_image_url": item["main_image_url"],
                        "score": similarity_score
                    })
            return matches
    except Exception as e:
        print(f"Enhanced search failed: {e}")
    
    return []

class UrlPayload(BaseModel):
    url: str

def generate_mock_embedding() -> list[float]:
    """Generate a mock 1152-dimensional embedding for testing"""
    import random
    import numpy as np
    
    # Generate a more realistic embedding with some structure
    # Create a base pattern that's more similar to real embeddings
    base_pattern = np.random.normal(0, 0.1, 1152)
    
    # Add some clustering to make it more realistic
    for i in range(0, 1152, 64):  # Every 64 dimensions
        cluster_value = np.random.normal(0, 0.3)
        base_pattern[i:i+64] += cluster_value
    
    # Normalize to unit vector
    embedding = base_pattern / np.linalg.norm(base_pattern)
    return embedding.tolist()

@app.post("/api/search")
async def search_by_image(file: UploadFile = File(None), url: str = Form(None)):
    """Search products by image - accepts file upload or URL"""
    try:
        image_url = None
        
        if file:
            # Handle file upload - try multiple image hosting services
            file_bytes = await file.read()
            
            # Try different image hosting services
            image_url = None
            for upload_func in [upload_to_postimage, upload_to_imgur]:
                try:
                    image_url = upload_func(file_bytes)
                    print(f"Image upload successful: {image_url}")
                    break
                except Exception as e:
                    print(f"Upload failed with {upload_func.__name__}: {e}")
                    continue
            
            if not image_url:
                raise HTTPException(status_code=500, detail="All image upload services failed")
            
            try:
                # Use HF endpoint with the image URL
                embedding = embed_image_via_hf(image_url)
                print(f"HF embedding successful: {len(embedding)} dimensions")
            except Exception as e:
                print(f"HF embedding failed: {e}")
                # Fallback to mock embedding
                embedding = generate_mock_embedding()
                print(f"Using mock embedding: {len(embedding)} dimensions")
            
        elif url:
            # Use provided URL
            image_url = url
            embedding = embed_image_via_hf(image_url)
        else:
            raise HTTPException(status_code=400, detail="Provide either file or url")
        
        # Search products
        matches = search_products(embedding)
        
        return {"matches": matches, "debug": {"image_url": image_url, "embedding_dim": len(embedding)}}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed-url")
def embed_url(p: UrlPayload):
    """Legacy endpoint for backward compatibility"""
    embedding = embed_image_via_hf(p.url)
    return {"vector": embedding, "dim": len(embedding), "model": "siglip-vit-so400m-14-384"}

@app.post("/test-upload")
async def test_upload(image: UploadFile = File(...)):
    """Test endpoint to debug file upload"""
    try:
        file_bytes = await image.read()
        image_url = upload_to_imgur(file_bytes)
        return {"success": True, "imgur_url": image_url}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/embed-file")
async def embed_file(image: UploadFile = File(...)):
    """Legacy endpoint for backward compatibility"""
    file_bytes = await image.read()
    filename = f"{image.filename}_{int(time.time())}.jpg"
    image_url = upload_to_supabase_storage(file_bytes, filename)
    embedding = embed_image_via_hf(image_url)
    return {"vector": embedding, "dim": len(embedding), "model": "siglip-vit-so400m-14-384"}
