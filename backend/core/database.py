from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from backend.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.database_url, echo=False, future=True)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with async_session_factory() as session:
        yield session


async def initialize_database() -> None:
    from backend.models.entities import AlertRecord, AnalyticsSnapshot, CameraRecord, EventRecord
    from backend.services.demo_seed import seed_demo_records
    from backend.core.config import settings

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    # Seed a default camera so the dashboard has a sensible first render.
    async with async_session_factory() as session:
        existing = await session.get(CameraRecord, 1)
        if existing is None:
            session.add(CameraRecord(id=1, name="Main Entrance", status="online", stream_url="webcam://0"))
            session.add(AnalyticsSnapshot(camera_id=1, people_count=0, density=0.0, alerts=0))
            await session.commit()

        if settings.demo_mode:
            await seed_demo_records(session)