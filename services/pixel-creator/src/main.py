"""
FastAPI service for creating IntentCore pixels via Selenium.

Pre-warms browser sessions so user-facing latency is ~3-5s instead of 13s.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .models import CreatePixelRequest, CreatePixelResponse
from .pixel_creator import fill_and_create, warm_session
from .session_pool import SessionPool

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

pool = SessionPool()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting session pool...")
    await pool.start()
    logger.info(f"Pool ready with {pool.warm_count} session(s)")
    yield
    logger.info("Shutting down session pool...")
    await pool.shutdown()


app = FastAPI(title="Pixel Creator", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.arkdata.io",
        "https://arkdata-hub.web.app",
        "https://arkdata-hub.firebaseapp.com",
        "http://localhost:5173",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _verify_api_key(x_api_key: str | None):
    if not x_api_key or x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "warm_sessions": pool.warm_count,
        "is_warming": pool.is_warming,
    }


@app.post("/api/create-pixel", response_model=CreatePixelResponse)
async def create_pixel(
    req: CreatePixelRequest,
    x_api_key: str | None = Header(default=None),
):
    _verify_api_key(x_api_key)

    import asyncio

    # Try to get a warm session; if none available, create one on the spot
    session = None
    try:
        session = await pool.acquire(timeout=5)
        logger.info("Using pre-warmed session")
    except TimeoutError:
        logger.info("No warm session available, creating one on the fly...")
        try:
            session = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(None, warm_session),
                timeout=60,
            )
        except Exception as e:
            logger.error(f"Failed to create on-demand session: {e}")
            return CreatePixelResponse(
                success=False,
                error="Failed to start browser session. Please try again.",
            )

    try:
        pixel_code, pixel_id = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(
                None, fill_and_create, session, req.name, req.url
            ),
            timeout=90,
        )
        return CreatePixelResponse(
            success=True,
            pixel_code=pixel_code,
            pixel_id=pixel_id,
        )
    except asyncio.TimeoutError:
        logger.error("Pixel creation timed out after 90s")
        session.close()
        return CreatePixelResponse(
            success=False,
            error="Pixel creation timed out. Please try again.",
        )
    except Exception as e:
        logger.error(f"Pixel creation failed: {e}")
        return CreatePixelResponse(
            success=False,
            error=str(e),
        )
