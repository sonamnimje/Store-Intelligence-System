from functools import lru_cache
from typing import Any

from pydantic import Field
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Store Intelligence System"
    app_env: str = "development"
    demo_mode: bool = True
    database_url: str = "sqlite+aiosqlite:///./store_intelligence.db"
    allowed_origins: list[str] = ["http://localhost:5173"]
    yolo_model: str = "yolov8n.pt"
    max_upload_mb: int = Field(default=200, ge=1, le=2048)
    event_overcrowd_threshold: int = Field(default=8, ge=1, le=500)
    event_linger_seconds: int = Field(default=20, ge=1, le=3600)
    event_linger_rearm_seconds: int = Field(default=30, ge=1, le=3600)
    event_exit_grace_frames: int = Field(default=5, ge=1, le=120)
    event_density_threshold: float = Field(default=0.18, ge=0.0, le=1.0)
    alert_cooldown_seconds: int = Field(default=12, ge=10, le=15)

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: Any) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()