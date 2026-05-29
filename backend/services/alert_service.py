from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.entities import AlertRecord


async def create_alert(session: AsyncSession, camera_id: int, severity: str, message: str, metadata: dict) -> AlertRecord:
    alert = AlertRecord(
        alert_id=str(uuid4()),
        timestamp=datetime.now(timezone.utc),
        message=message,
        severity=severity,
        camera_id=camera_id,
        alert_metadata=metadata,
    )
    session.add(alert)
    await session.commit()
    await session.refresh(alert)
    return alert


async def list_alerts(session: AsyncSession, limit: int = 10) -> list[AlertRecord]:
    result = await session.execute(select(AlertRecord).order_by(AlertRecord.timestamp.desc()).limit(limit))
    return list(result.scalars().all())