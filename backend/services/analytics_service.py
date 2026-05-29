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
    await session.commit()
    await session.refresh(snapshot)
    return snapshot


async def get_latest_snapshot(session: AsyncSession, camera_id: int) -> AnalyticsSnapshot | None:
    result = await session.execute(
        select(AnalyticsSnapshot).where(AnalyticsSnapshot.camera_id == camera_id).order_by(desc(AnalyticsSnapshot.updated_at))
    )
    return result.scalars().first()


async def build_analytics_payload(session: AsyncSession, camera_id: int = 1) -> dict:
    snapshot = await get_latest_snapshot(session, camera_id)
    events_result = await session.execute(select(EventRecord).where(EventRecord.camera_id == camera_id).order_by(EventRecord.timestamp.desc()).limit(12))
    trend_events = list(events_result.scalars().all())

    if snapshot is None:
        snapshot = AnalyticsSnapshot(camera_id=camera_id, people_count=0, density=0.0, alerts=0, updated_at=datetime.now(timezone.utc))

    trends = [
        {"label": event.event_type, "value": 1, "severity": event.severity}
        for event in trend_events
    ]

    return {
        "people_count": snapshot.people_count,
        "density": snapshot.density,
        "dwell_time": float(snapshot.people_count) * 0.8,
        "zone_counts": {"main": max(0, snapshot.people_count - 1), "restricted": 1 if snapshot.people_count else 0},
        "alerts": snapshot.alerts,
        "camera_id": camera_id,
        "updated_at": snapshot.updated_at,
        "trends": trends,
    }