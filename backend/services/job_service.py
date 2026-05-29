from __future__ import annotations

from datetime import datetime, timezone


_jobs: dict[str, dict] = {}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def create_job(task_id: str, camera_id: int, filename: str) -> dict:
    job = {
        "task_id": task_id,
        "camera_id": camera_id,
        "filename": filename,
        "status": "queued",
        "progress": 0,
        "message": "Upload received",
        "started_at": _utc_now(),
        "updated_at": _utc_now(),
    }
    _jobs[task_id] = job
    return job


def update_job(task_id: str, **updates) -> dict | None:
    job = _jobs.get(task_id)
    if job is None:
        return None
    job.update(updates)
    job["updated_at"] = _utc_now()
    return job


def get_job(task_id: str) -> dict | None:
    return _jobs.get(task_id)


def list_jobs() -> list[dict]:
    return list(_jobs.values())


def latest_job_for_camera(camera_id: int) -> dict | None:
    camera_jobs = [job for job in _jobs.values() if job.get("camera_id") == camera_id]
    if not camera_jobs:
        return None
    return sorted(camera_jobs, key=lambda job: job["updated_at"], reverse=True)[0]