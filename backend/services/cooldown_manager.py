from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any


@dataclass
class CooldownState:
    last_trigger_at: datetime
    severity: str
    event_id: str | None = None


class CooldownManager:
    def __init__(self) -> None:
        self.active_events: dict[tuple[int, str, str], CooldownState] = {}

    @staticmethod
    def build_event_key(camera_id: int, event_type: str, track_key: str) -> tuple[int, str, str]:
        return camera_id, event_type, track_key

    def should_emit(self, camera_id: int, event_type: str, track_key: str, severity: str, cooldown_seconds: int) -> bool:
        now = datetime.now(timezone.utc)
        key = self.build_event_key(camera_id, event_type, track_key)
        current = self.active_events.get(key)
        if current is None:
            return True

        elapsed = (now - current.last_trigger_at).total_seconds()
        if current.severity != severity:
            return True

        if elapsed < cooldown_seconds:
            print(f"[SKIPPED DUPLICATE EVENT] camera_id={camera_id} event_type={event_type} track_key={track_key} cooldown={cooldown_seconds}s")
            return False

        return True

    def mark_emitted(self, camera_id: int, event_type: str, track_key: str, severity: str, event_id: str) -> None:
        key = self.build_event_key(camera_id, event_type, track_key)
        self.active_events[key] = CooldownState(last_trigger_at=datetime.now(timezone.utc), severity=severity, event_id=event_id)

    def release(self, camera_id: int, event_type: str, track_key: str) -> None:
        return

    def cleanup(self, older_than_seconds: int = 120) -> None:
        now = datetime.now(timezone.utc)
        for key, state in list(self.active_events.items()):
            if (now - state.last_trigger_at).total_seconds() > older_than_seconds:
                self.active_events.pop(key, None)