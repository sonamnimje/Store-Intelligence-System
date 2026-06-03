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
            event_type="crowd_density",
            severity="high",
            camera_id=1,
            event_key="1:crowding:camera",
            first_seen_at=now - timedelta(minutes=5, seconds=30),
            last_seen_at=now - timedelta(minutes=5),
            occurrence_count=18,
            is_active=False,
            confidence=0.94,
            duration_seconds=30.0,
            status="closed",
            event_metadata={"people_count": 14, "threshold": 8, "track_ids": [1, 2, 3, 4], "lifecycle_state": "closed", "confidence": 0.94, "status": "closed"},
        ),
        EventRecord(
            event_id=str(uuid4()),
            timestamp=now - timedelta(minutes=3),
            event_type="suspicious_lingering",
            severity="medium",
            camera_id=1,
            event_key="1:suspicious_lingering:2",
            first_seen_at=now - timedelta(minutes=3, seconds=20),
            last_seen_at=now - timedelta(minutes=3),
            track_id=2,
            track_key="2",
            track_ids=[2],
            occurrence_count=22,
            is_active=False,
            confidence=0.88,
            duration_seconds=20.0,
            status="closed",
            event_metadata={"track_id": 2, "track_key": "2", "track_ids": [2], "duration_seconds": 20, "lifecycle_state": "closed", "confidence": 0.88, "status": "closed"},
        ),
        EventRecord(
            event_id=str(uuid4()),
            timestamp=now - timedelta(minutes=1),
            event_type="intrusion",
            severity="high",
            camera_id=1,
            event_key="1:theft_risk:7",
            first_seen_at=now - timedelta(minutes=1, seconds=15),
            last_seen_at=now - timedelta(minutes=1),
            track_id=7,
            track_key="7",
            track_ids=[7],
            occurrence_count=6,
            is_active=False,
            confidence=0.96,
            duration_seconds=15.0,
            status="closed",
            event_metadata={"track_id": 7, "track_key": "7", "track_ids": [7], "lifecycle_state": "closed", "confidence": 0.96, "status": "closed"},
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