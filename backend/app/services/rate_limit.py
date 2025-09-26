import os, time
from fastapi import Request, HTTPException
from typing import Callable
from functools import wraps

RPS = float(os.getenv("RATE_LIMIT_RPS", "1"))
BURST = int(os.getenv("RATE_LIMIT_BURST", "3"))
TOKENS: dict[str, tuple[float, float]] = {}  # ip -> (tokens, last)

def rate_limit():
    def decorator(fn: Callable):
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            request: Request = kwargs.get("request")
            if request is None:
                for a in args:
                    if isinstance(a, Request): request = a; break
            ip = request.client.host if request else "unknown"
            now = time.time()
            tokens, last = TOKENS.get(ip, (BURST, now))
            # refill
            tokens = min(BURST, tokens + (now - last) * RPS)
            if tokens < 1.0:
                raise HTTPException(status_code=429, detail="Too many requests")
            TOKENS[ip] = (tokens - 1.0, now)
            return await fn(*args, **kwargs)
        return wrapper
    return decorator
