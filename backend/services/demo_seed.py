from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.entities import AlertRecord, AnalyticsSnapshot, EventRecord


async def seed_demo_records(session: AsyncSession) -> None:
    existing_events = await session.execute(select(EventRecord).limit(1))
    if existing_events.scalars().first() is not None:
        return

    now = datetime.now(timezone.utc)
    seed_events = [
        EventRecord(
            event_id=str(uuid4()),
            timestamp=now - timedelta(minutes=5),
            event_type="overcrowding",
            severity="high",
            camera_id=1,
            event_metadata={"people_count": 14, "threshold": 8, "frame_index": 18},
        ),
        EventRecord(
            event_id=str(uuid4()),
            timestamp=now - timedelta(minutes=3),
            event_type="suspicious_lingering",
            severity="medium",
            camera_id=1,
            event_metadata={"track_ids": [2, 4], "linger_seconds": 16, "frame_index": 39},
        ),
        EventRecord(
            event_id=str(uuid4()),
            timestamp=now - timedelta(minutes=1),
            event_type="restricted_zone_entry",
            severity="high",
            camera_id=1,
            event_metadata={"track_ids": [7], "frame_index": 52},
        ),
    ]
    seed_alerts = [
        AlertRecord(
            alert_id=str(uuid4()),
            timestamp=now - timedelta(minutes=5),
            message="Overcrowding detected",
            severity="high",
            camera_id=1,
            alert_metadata={"people_count": 14, "threshold": 8},
        ),
        AlertRecord(
            alert_id=str(uuid4()),
            timestamp=now - timedelta(minutes=3),
            message="Suspicious lingering detected",
            severity="medium",
            camera_id=1,
            alert_metadata={"track_ids": [2, 4]},
        ),
    ]

    session.add(AnalyticsSnapshot(camera_id=1, people_count=12, density=0.32, alerts=3))
    session.add_all(seed_events + seed_alerts)
    await session.commit()