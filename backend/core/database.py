from collections.abc import AsyncIterator

from sqlalchemy import inspect, text
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
        await _ensure_event_schema(connection)

    # Seed a default camera so the dashboard has a sensible first render.
    async with async_session_factory() as session:
        existing = await session.get(CameraRecord, 1)
        if existing is None:
            session.add(CameraRecord(id=1, name="Main Entrance", status="online", stream_url="webcam://0"))
            session.add(AnalyticsSnapshot(camera_id=1, people_count=0, density=0.0, alerts=0))
            await session.commit()

        if settings.demo_mode:
            await seed_demo_records(session)


async def _ensure_event_schema(connection) -> None:
    dialect_name = connection.dialect.name
    if dialect_name == "sqlite":
        result = await connection.exec_driver_sql("PRAGMA table_info(events)")
        existing_columns = {row[1] for row in result.fetchall()}
        column_definitions = {
            "event_key": "ALTER TABLE events ADD COLUMN event_key VARCHAR(160)",
            "first_seen_at": "ALTER TABLE events ADD COLUMN first_seen_at DATETIME",
            "last_seen_at": "ALTER TABLE events ADD COLUMN last_seen_at DATETIME",
            "track_id": "ALTER TABLE events ADD COLUMN track_id INTEGER",
            "track_key": "ALTER TABLE events ADD COLUMN track_key VARCHAR(160)",
            "track_ids": "ALTER TABLE events ADD COLUMN track_ids JSON",
            "occurrence_count": "ALTER TABLE events ADD COLUMN occurrence_count INTEGER DEFAULT 1",
            "is_active": "ALTER TABLE events ADD COLUMN is_active BOOLEAN DEFAULT 1",
        }
        for column_name, statement in column_definitions.items():
            if column_name not in existing_columns:
                await connection.exec_driver_sql(statement)
        return

    inspector = inspect(connection)
    if "events" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("events")}
    add_statements = {
        "event_key": "ALTER TABLE events ADD COLUMN event_key VARCHAR(160)",
        "first_seen_at": "ALTER TABLE events ADD COLUMN first_seen_at TIMESTAMP",
        "last_seen_at": "ALTER TABLE events ADD COLUMN last_seen_at TIMESTAMP",
        "track_id": "ALTER TABLE events ADD COLUMN track_id INTEGER",
        "track_key": "ALTER TABLE events ADD COLUMN track_key VARCHAR(160)",
        "track_ids": "ALTER TABLE events ADD COLUMN track_ids JSON",
        "occurrence_count": "ALTER TABLE events ADD COLUMN occurrence_count INTEGER DEFAULT 1",
        "is_active": "ALTER TABLE events ADD COLUMN is_active BOOLEAN DEFAULT TRUE",
    }
    for column_name, statement in add_statements.items():
        if column_name not in existing_columns:
            await connection.exec_driver_sql(statement)