from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: str
    event_key: str | None = None
    timestamp: datetime
    first_seen_at: datetime | None = None
    last_seen_at: datetime | None = None
    event_type: str
    severity: str
    camera_id: int
    track_id: int | None = None
    track_key: str | None = None
    track_ids: list[int] = Field(default_factory=list)
    occurrence_count: int = 1
    is_active: bool = True
    confidence: float = 0.0
    duration_seconds: float = 0.0
    status: str = "active"
    metadata: dict = Field(default_factory=dict, alias="event_metadata")


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    alert_id: str
    timestamp: datetime
    message: str
    severity: str
    camera_id: int
    metadata: dict = Field(default_factory=dict, alias="alert_metadata")


class AnalyticsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    people_count: int
    density: float
    dwell_time: float = 0.0
    zone_counts: dict = Field(default_factory=dict)
    alerts: int
    camera_id: int
    updated_at: datetime
    trends: list[dict] = Field(default_factory=list)
    camera_activity: list[dict] = Field(default_factory=list)


class CameraStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    camera_id: int
    name: str
    status: str
    stream_url: str
    active_people: int = 0
    fps: float = 0.0
    detection_status: str = "idle"
    processing_status: str = "idle"
    live: bool = True


class UploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    task_id: str
    status: str


class JobStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    task_id: str
    camera_id: int
    filename: str
    status: str
    progress: int
    message: str
    started_at: datetime
    updated_at: datetime
