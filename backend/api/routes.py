from __future__ import annotations

import asyncio
from io import BytesIO
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import async_session_factory, get_db
from backend.core.observability import metrics_snapshot
from backend.models.entities import AlertRecord, AnalyticsSnapshot, CameraRecord, EventRecord
from backend.models.schemas import AlertOut, AnalyticsOut, CameraStatusOut, EventOut, JobStatusOut, UploadResponse
from backend.services.analytics_service import build_analytics_payload
from backend.services.alert_service import list_alerts
from backend.services.job_service import create_job, get_job, latest_job_for_camera
from backend.services.visualization import build_demo_visualization, encode_png
from backend.services.video_service import process_video_file, save_upload
from backend.websocket.manager import websocket_manager

router = APIRouter()


@router.get("/")
async def root() -> dict[str, str]:
    return {
        "message": "Store Intelligence System API is running",
        "docs": "/docs",
        "websocket": "/ws/live",
    }


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/metrics")
async def metrics(request: Request) -> dict:
    return metrics_snapshot(request.app.state.metrics)


@router.post("/upload-video", response_model=UploadResponse)
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)) -> UploadResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="A video file is required")

    path = await save_upload(file)
    task_id = str(uuid4())
    create_job(task_id, camera_id=1, filename=file.filename)
    background_tasks.add_task(process_video_file, async_session_factory, path, task_id, 1)
    await websocket_manager.broadcast({"type": "job_status", "payload": get_job(task_id)})
    return UploadResponse(task_id=task_id, status="queued")


@router.get("/events", response_model=list[EventOut])
async def get_events(db: AsyncSession = Depends(get_db)) -> list[EventOut]:
    result = await db.execute(select(EventRecord).order_by(desc(EventRecord.last_seen_at).nullslast(), desc(EventRecord.timestamp)).limit(200))
    events = list(result.scalars().all())
    return [EventOut.model_validate(event) for event in events]


@router.get("/analytics", response_model=AnalyticsOut)
async def get_analytics(db: AsyncSession = Depends(get_db)) -> AnalyticsOut:
    payload = await build_analytics_payload(db, camera_id=1)
    return AnalyticsOut(**payload)


@router.get("/alerts", response_model=list[AlertOut])
async def get_alerts(db: AsyncSession = Depends(get_db)) -> list[AlertOut]:
    alerts = await list_alerts(db, limit=10)
    return [AlertOut.model_validate(alert) for alert in alerts]


@router.get("/camera-status", response_model=list[CameraStatusOut])
async def get_camera_status(db: AsyncSession = Depends(get_db)) -> list[CameraStatusOut]:
    cameras = list((await db.execute(select(CameraRecord).order_by(CameraRecord.id))).scalars().all())
    snapshot_result = await db.execute(select(AnalyticsSnapshot).order_by(desc(AnalyticsSnapshot.updated_at)))
    latest_snapshot = snapshot_result.scalars().first()

    statuses: list[CameraStatusOut] = []
    for camera in cameras:
        latest_job = latest_job_for_camera(camera.id)
        statuses.append(
            CameraStatusOut(
                camera_id=camera.id,
                name=camera.name,
                status=camera.status,
                stream_url=camera.stream_url,
                active_people=latest_snapshot.people_count if latest_snapshot and latest_snapshot.camera_id == camera.id else 0,
                fps=24.0 if camera.status == "online" else 0.0,
                detection_status=latest_job["status"] if latest_job else "idle",
                processing_status=latest_job["message"] if latest_job else "idle",
                live=camera.status == "online",
            )
        )
    return statuses


@router.get("/processing-status/{task_id}", response_model=JobStatusOut)
async def get_processing_status(task_id: str) -> JobStatusOut:
    job = get_job(task_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return JobStatusOut.model_validate(job)


@router.get("/demo-visualization")
async def demo_visualization(db: AsyncSession = Depends(get_db)) -> StreamingResponse:
    payload = await build_analytics_payload(db, camera_id=1)
    frame = build_demo_visualization(payload)
    png_bytes = encode_png(frame)
    return StreamingResponse(BytesIO(png_bytes), media_type="image/png")


@router.websocket("/ws/live")
async def websocket_live(websocket: WebSocket) -> None:
    await websocket_manager.connect(websocket)
    try:
        await websocket.send_json({"type": "ready", "payload": {"message": "connected"}})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
