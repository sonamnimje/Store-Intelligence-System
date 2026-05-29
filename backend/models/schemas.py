from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: str
    timestamp: datetime
    event_type: str
    severity: str
    camera_id: int
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
