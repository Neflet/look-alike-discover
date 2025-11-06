import os
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from ..services.supabase_client import fetch_recent_events

router = APIRouter()

@router.get("/admin/analytics")
async def get_analytics(
    key: str = Query("", description="Admin key"),
    limit: int = Query(100, description="Maximum number of results")
):
    """Get analytics events"""
    if key != os.getenv("ADMIN_KEY", "changeme"):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        events = await fetch_recent_events(limit=limit)
        return {"events": events, "count": len(events)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/analytics/stats")
async def get_analytics_stats(
    key: str = Query("", description="Admin key")
):
    """Get aggregated analytics statistics"""
    if key != os.getenv("ADMIN_KEY", "changeme"):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        events = await fetch_recent_events(limit=1000)
        
        # Aggregate by event type
        stats = {}
        unique_users = set()
        unique_sessions = set()
        
        for event in events:
            event_type = event.get("event_type", "unknown")
            stats[event_type] = stats.get(event_type, 0) + 1
            
            if event.get("user_id"):
                unique_users.add(event["user_id"])
            if event.get("session_id"):
                unique_sessions.add(event["session_id"])
        
        return {
            "events_by_type": [{"event_type": k, "count": v} for k, v in stats.items()],
            "unique_users": len(unique_users),
            "unique_sessions": len(unique_sessions),
            "total_events": len(events)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

