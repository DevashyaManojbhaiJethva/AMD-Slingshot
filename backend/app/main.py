from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db import ping_database
from app.routers.analyze import router as analyze_router
from app.routers.history import router as history_router
from app.services.firebase_service import initialize_firebase


logger = logging.getLogger(__name__)


app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_path = Path(settings.upload_dir)
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

app.include_router(analyze_router)
app.include_router(history_router)


@app.on_event("startup")
async def on_startup() -> None:
    initialize_firebase()
    try:
        await ping_database()
    except Exception:
        logger.exception("Database ping failed during startup")
        if settings.require_db_on_startup:
            raise


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": settings.app_name}
