from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.entities import AnalyticsSnapshot, EventRecord


async def store_snapshot(session: AsyncSession, camera_id: int, people_count: int, density: float, alerts: int) -> AnalyticsSnapshot:
    snapshot = AnalyticsSnapshot(
        camera_id=camera_id,
        people_count=people_count,
        density=density,
        alerts=alerts,
        updated_at=datetime.now(timezone.utc),
    )
    session.add(snapshot)
    return snapshot


async def get_latest_snapshot(session: AsyncSession, camera_id: int) -> AnalyticsSnapshot | None:
    result = await session.execute(
        select(AnalyticsSnapshot).where(AnalyticsSnapshot.camera_id == camera_id).order_by(desc(AnalyticsSnapshot.updated_at))
    )
    return result.scalars().first()


async def build_analytics_payload(session: AsyncSession, camera_id: int = 1) -> dict:
    snapshot = await get_latest_snapshot(session, camera_id)
    events_result = await session.execute(
        select(EventRecord).where(EventRecord.camera_id == camera_id).order_by(EventRecord.last_seen_at.desc().nullslast(), EventRecord.timestamp.desc()).limit(12)
    )
    trend_events = list(events_result.scalars().all())

    if snapshot is None:
        snapshot = AnalyticsSnapshot(camera_id=camera_id, people_count=0, density=0.0, alerts=0, updated_at=datetime.now(timezone.utc))

    trends: list[dict] = []
    counts: dict[str, int] = {}
    severities: dict[str, str] = {}
    for event in trend_events:
        counts[event.event_type] = counts.get(event.event_type, 0) + max(1, event.occurrence_count)
        severities[event.event_type] = event.severity

    for label, value in counts.items():
        trends.append({"label": label, "value": value, "severity": severities[label]})

    camera_activity = [{"camera_id": event.camera_id, "value": event.occurrence_count, "status": event.status, "confidence": event.confidence} for event in trend_events[:6]]

    return {
        "people_count": snapshot.people_count,
        "density": snapshot.density,
        "dwell_time": float(snapshot.people_count) * 0.8,
        "zone_counts": {"main": max(0, snapshot.people_count - 1), "restricted": 1 if snapshot.people_count else 0},
        "alerts": snapshot.alerts,
        "camera_id": camera_id,
        "updated_at": snapshot.updated_at,
        "trends": trends,
        "camera_activity": camera_activity,
    }