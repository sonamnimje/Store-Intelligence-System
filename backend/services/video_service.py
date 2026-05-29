from __future__ import annotations

import asyncio
from pathlib import Path
from uuid import uuid4

import cv2
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from backend.analytics.rules import DetectionSummary
from backend.core.config import settings
from backend.models.entities import CameraRecord, EventRecord
from backend.services.alert_service import create_alert
from backend.services.event_manager import EventManager
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
    event_manager = EventManager()
    total_people = 0
    total_alerts = 0
    frame_index = 0
    zone_counts: dict[str, int] = {"main": 0, "restricted": 0}
    last_tracked_people: list = []
    last_density = 0.0
    last_dwell_time = 0.0
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
                last_tracked_people = tracked_people
                zone_counts = detector.zone_counts(tracked_people)
                dwell_time = detector.estimate_dwell_time(tracked_people)
                last_dwell_time = dwell_time
                last_density = detector.estimate_density(frame, tracked_people)
                summary = DetectionSummary(
                    camera_id=camera_id,
                    people_count=len(tracked_people),
                    density=last_density,
                    dwell_time=dwell_time,
                    zone_counts=zone_counts,
                    active_track_ids=[track.track_id for track in tracked_people],
                    lingering_ids=[],
                    restricted_zone_ids=detector.find_restricted_entries(tracked_people),
                    unusual_motion_ids=detector.find_unusual_motion(tracked_people),
                )

                elapsed_seconds = frame_index * frame_interval_seconds
                events = await event_manager.evaluate_frame(
                    session,
                    camera_id=camera_id,
                    frame_index=frame_index,
                    elapsed_seconds=elapsed_seconds,
                    tracked_objects=tracked_people,
                    summary=summary,
                    overcrowd_threshold=settings.event_overcrowd_threshold,
                    linger_seconds=settings.event_linger_seconds,
                    density_threshold=settings.event_density_threshold,
                    crowding_cooldown_seconds=settings.event_crowding_cooldown_seconds,
                    theft_risk_cooldown_seconds=settings.event_theft_risk_cooldown_seconds,
                    unusual_activity_cooldown_seconds=settings.event_unusual_activity_cooldown_seconds,
                    lingering_cooldown_seconds=settings.event_lingering_cooldown_seconds,
                    exit_grace_frames=settings.event_exit_grace_frames,
                )

                for event in events:
                    if event["action"] == "close":
                        await session.execute(
                            EventRecord.__table__.update()
                            .where(EventRecord.event_id == event["event_id"])
                            .values(
                                last_seen_at=event["timestamp"],
                                occurrence_count=event["metadata"].get("occurrence_count", 1),
                                is_active=False,
                                event_metadata=event["metadata"],
                            )
                        )
                        continue

                    event_record = EventRecord(
                        event_id=event["event_id"],
                        event_key=event["event_key"],
                        timestamp=event["timestamp"],
                        first_seen_at=event["timestamp"],
                        last_seen_at=event["timestamp"],
                        event_type=event["event_type"],
                        severity=event["severity"],
                        camera_id=camera_id,
                        track_id=event.get("track_id"),
                        track_key=event.get("track_key"),
                        track_ids=event.get("track_ids") or [],
                        occurrence_count=1,
                        is_active=True,
                        event_metadata=event["metadata"],
                    )
                    session.add(event_record)
                    total_alerts += 1
                    alert = await create_alert(
                        session=session,
                        camera_id=camera_id,
                        severity=event["severity"],
                        message=f"{event['event_type'].replace('_', ' ').title()} detected",
                        metadata=event["metadata"],
                    )
                    await websocket_manager.broadcast({"type": "alert", "payload": alert.alert_metadata | {"message": alert.message, "severity": alert.severity}})

                total_people = max(total_people, len(tracked_people))
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

                if frame_index % 30 == 0:
                    await store_snapshot(session, camera_id=camera_id, people_count=len(tracked_people), density=summary.density, alerts=total_alerts)
                    await event_manager.flush_active_incidents(session)
                    await session.commit()

                await asyncio.sleep(0)

            await store_snapshot(session, camera_id=camera_id, people_count=len(last_tracked_people), density=last_density, alerts=total_alerts)
            await event_manager.close_all(session)
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