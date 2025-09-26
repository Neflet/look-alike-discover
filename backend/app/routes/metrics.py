import os, datetime
from fastapi import APIRouter, HTTPException, Query
from ..services.supabase_client import fetch_recent_events

router = APIRouter()

@router.get("/admin/metrics")
async def metrics(key: str = Query("")):
    if key != os.getenv("ADMIN_KEY", "changeme"):
        raise HTTPException(status_code=401, detail="unauthorized")
    rows = await fetch_recent_events(limit=50)
    avg_ms = int(sum(r.get("event_data",{}).get("search_time_ms",0) for r in rows if r.get("event_type")=="search_succeeded") / max(1, sum(1 for r in rows if r.get("event_type")=="search_succeeded")))
    return {"recent": rows, "avg_search_time_ms": avg_ms}
