from __future__ import annotations

import asyncio
from pathlib import Path
from uuid import uuid4

import cv2
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from backend.analytics.rules import DetectionSummary, evaluate_events
from backend.core.config import settings
from backend.models.entities import CameraRecord, EventRecord
from backend.services.alert_service import create_alert
from backend.services.alert_dedup import filter_event_by_cooldown
from backend.services.event_lifecycle import EventLifecycleManager
from backend.services.analytics_service import store_snapshot
from backend.services.job_service import update_job
from backend.websocket.manager import websocket_manager
from ai_engine import inference as ai_inference


UPLOAD_DIR = Path("uploads")


class VideoJobResult(dict):
    pass


async def save_upload(file: UploadFile) -> Path:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    destination = UPLOAD_DIR / f"{uuid4()}_{file.filename or 'video.mp4'}"
    content = await file.read()
    destination.write_bytes(content)
    return destination


async def process_video_file(session_factory, video_path: Path, task_id: str, camera_id: int = 1) -> dict:
    cap = cv2.VideoCapture(str(video_path))
    detector = ai_inference.create_pipeline(settings.yolo_model)
    lifecycle_manager = EventLifecycleManager()
    total_people = 0
    total_alerts = 0
    frame_index = 0
    zone_counts: dict[str, int] = {"main": 0, "restricted": 0}
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    frame_interval_seconds = 1.0 / fps if fps and fps >= 1.0 else 1.0 / 30.0

    try:
        if not cap.isOpened():
            raise ValueError(f"Unable to open video source: {video_path}")

        update_job(task_id, status="processing", progress=1, message="AI processing started")
        await websocket_manager.broadcast({"type": "job_status", "payload": await _job_payload(task_id)})

        async with session_factory() as session:
            while True:
                ok, frame = cap.read()
                if not ok:
                    break

                frame_index += 1
                detections = detector.detect(frame, frame_index)
                tracked_people = detector.track(detections, frame_index)
                zone_counts = detector.zone_counts(tracked_people)
                dwell_time = detector.estimate_dwell_time(tracked_people)
                summary = DetectionSummary(
                    camera_id=camera_id,
                    people_count=len(tracked_people),
                    density=detector.estimate_density(frame, tracked_people),
                    dwell_time=dwell_time,
                    zone_counts=zone_counts,
                    lingering_ids=[],
                    restricted_zone_ids=detector.find_restricted_entries(tracked_people),
                    unusual_motion_ids=detector.find_unusual_motion(tracked_people),
                )

                elapsed_seconds = frame_index * frame_interval_seconds
                events = lifecycle_manager.observe_lingering(
                    camera_id=camera_id,
                    tracked_objects=tracked_people,
                    frame_index=frame_index,
                    elapsed_seconds=elapsed_seconds,
                    threshold_seconds=settings.event_linger_seconds,
                    rearm_seconds=settings.event_linger_rearm_seconds,
                    exit_grace_frames=settings.event_exit_grace_frames,
                )
                events.extend(
                    evaluate_events(
                    summary,
                    settings.event_overcrowd_threshold,
                    settings.event_linger_seconds,
                    settings.event_density_threshold,
                    )
                )

                for event in events:
                    filtered_metadata = await filter_event_by_cooldown(
                        camera_id=camera_id,
                        event_type=event["event_type"],
                        metadata={**event["metadata"], "frame_index": frame_index},
                        cooldown_seconds=settings.alert_cooldown_seconds,
                    )
                    if filtered_metadata is None:
                        continue

                    total_alerts += 1
                    record = EventRecord(
                        event_id=str(uuid4()),
                        timestamp=event["timestamp"],
                        event_type=event["event_type"],
                        severity=event["severity"],
                        camera_id=camera_id,
                        event_metadata=filtered_metadata,
                    )
                    session.add(record)
                    alert = await create_alert(
                        session=session,
                        camera_id=camera_id,
                        severity=event["severity"],
                        message=f"{event['event_type'].replace('_', ' ').title()} detected",
                        metadata=filtered_metadata,
                    )
                    await websocket_manager.broadcast({"type": "alert", "payload": alert.alert_metadata | {"message": alert.message, "severity": alert.severity}})

                total_people = max(total_people, len(tracked_people))
                await store_snapshot(session, camera_id=camera_id, people_count=len(tracked_people), density=summary.density, alerts=total_alerts)
                await websocket_manager.broadcast(
                    {
                        "type": "analytics",
                        "payload": {
                            "camera_id": camera_id,
                            "people_count": len(tracked_people),
                            "density": summary.density,
                            "dwell_time": dwell_time,
                            "zone_counts": zone_counts,
                            "alerts": total_alerts,
                        },
                    }
                )

                if frame_index % 10 == 0:
                    progress = min(95, 5 + frame_index)
                    update_job(task_id, status="processing", progress=progress, message=f"Processed {frame_index} frames")
                    await websocket_manager.broadcast({"type": "job_status", "payload": await _job_payload(task_id)})

                await asyncio.sleep(0)

            await session.commit()

        update_job(task_id, status="completed", progress=100, message="Processing complete")
        await websocket_manager.broadcast({"type": "job_status", "payload": await _job_payload(task_id)})
        return {"frames_processed": frame_index, "peak_people": total_people, "alerts": total_alerts}
    except Exception as exc:
        update_job(task_id, status="failed", progress=100, message=str(exc))
        await websocket_manager.broadcast({"type": "job_status", "payload": await _job_payload(task_id)})
        raise
    finally:
        cap.release()


async def _job_payload(job_id: str) -> dict:
    from backend.services.job_service import get_job

    job = get_job(job_id)
    return job or {"task_id": job_id, "status": "unknown", "progress": 0, "message": "Job not found"}


async def ensure_camera(session: AsyncSession, camera_id: int, stream_url: str = "webcam://0") -> CameraRecord:
    camera = await session.get(CameraRecord, camera_id)
    if camera is None:
        camera = CameraRecord(id=camera_id, name=f"Camera {camera_id}", status="online", stream_url=stream_url)
        session.add(camera)
        await session.commit()
        await session.refresh(camera)
    return camera