import os, aiohttp, json, base64

URL = os.getenv("SUPABASE_URL","")
SRK = os.getenv("SUPABASE_SERVICE_ROLE_KEY","")
BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET","uploads")

# REST helpers
async def supa_rpc(fn: str, args: dict):
    async with aiohttp.ClientSession() as s:
        async with s.post(f"{URL}/rest/v1/rpc/{fn}",
                          headers={"apikey": SRK, "Authorization": f"Bearer {SRK}", "Content-Type":"application/json"},
                          data=json.dumps(args)) as resp:
            if resp.status >= 400:
                return {"error": f"RPC {resp.status}: {await resp.text()}"}
            return {"data": await resp.json()}

async def supa_upload_bytes(path: str, data: bytes, content_type="image/jpeg"):
    async with aiohttp.ClientSession() as s:
        async with s.post(f"{URL}/storage/v1/object/{BUCKET}/{path}",
                          headers={"apikey": SRK, "Authorization": f"Bearer {SRK}", "Content-Type": content_type},
                          data=data) as resp:
            if resp.status >= 400:
                raise RuntimeError(f"upload {resp.status}: {await resp.text()}")

async def supa_sign_url(path: str, expires: int):
    async with aiohttp.ClientSession() as s:
        async with s.post(f"{URL}/storage/v1/object/sign/{BUCKET}/{path}",
                          headers={"apikey": SRK, "Authorization": f"Bearer {SRK}", "Content-Type":"application/json"},
                          data=json.dumps({"expiresIn": expires})) as resp:
            if resp.status >= 400:
                raise RuntimeError(f"sign {resp.status}: {await resp.text()}")
            out = await resp.json()
            # returns something like {"signedURL": "/storage/v1/object/sign/...token=..."}
            signed_path = out.get("signedURL","")
            if signed_path.startswith("/"):
                return f"{URL}{signed_path}"
            return signed_path

# simple cache table and analytics
async def supa_select_cache(image_hash: str):
    async with aiohttp.ClientSession() as s:
        async with s.get(f"{URL}/rest/v1/query_cache?select=embedding&image_hash=eq.{image_hash}&limit=1",
                         headers={"apikey": SRK, "Authorization": f"Bearer {SRK}"}) as resp:
            if resp.status == 200:
                rows = await resp.json()
                if rows:
                    # Supabase returns pgvector as array if enabled via REST config; else use RPC to fetch
                    emb = rows[0].get("embedding")
                    return emb
            return None

async def supa_insert_cache(image_hash: str, embedding: list[float]):
    async with aiohttp.ClientSession() as s:
        async with s.post(f"{URL}/rest/v1/query_cache",
                          headers={"apikey": SRK, "Authorization": f"Bearer {SRK}", "Content-Type":"application/json", "Prefer":"resolution=merge-duplicates"},
                          data=json.dumps({"image_hash": image_hash, "embedding": embedding})) as resp:
            if resp.status >= 400:
                # ignore cache errors
                _ = await resp.text()

async def log_event(event_type: str, event_data: dict):
    async with aiohttp.ClientSession() as s:
        async with s.post(f"{URL}/rest/v1/analytics_events",
                          headers={"apikey": SRK, "Authorization": f"Bearer {SRK}", "Content-Type":"application/json"},
                          data=json.dumps({"event_type": event_type, "event_data": event_data})) as resp:
            return

async def fetch_recent_events(limit: int = 50):
    async with aiohttp.ClientSession() as s:
        async with s.get(f"{URL}/rest/v1/analytics_events?order=created_at.desc&limit={limit}",
                         headers={"apikey": SRK, "Authorization": f"Bearer {SRK}"}) as resp:
            if resp.status == 200:
                return await resp.json()
            return []
