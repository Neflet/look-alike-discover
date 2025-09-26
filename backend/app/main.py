from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.search import router as search_router
from .routes.health import router as health_router
from .routes.metrics import router as metrics_router

app = FastAPI(title="SwagAI API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(metrics_router, prefix="/api")
