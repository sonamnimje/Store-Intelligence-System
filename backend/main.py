import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.routes import router as api_router
from backend.core.config import settings
from backend.core.database import initialize_database
from backend.core.logging import configure_logging
from backend.core.observability import create_metrics_state, generic_exception_handler, request_timing_middleware
from backend.websocket.manager import websocket_manager

configure_logging()

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="AI-powered store intelligence platform for CCTV analytics and alerts.",
)

app.state.metrics = create_metrics_state()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(request_timing_middleware)

app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(api_router)


@app.on_event("startup")
async def on_startup() -> None:
    await initialize_database()
    await websocket_manager.start()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await websocket_manager.stop()