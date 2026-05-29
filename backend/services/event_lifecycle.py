from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from ai_engine.tracking.bytetrack_adapter import TrackedObject


@dataclass
class _TrackLifecycleState:
    track_id: int
    first_seen_frame: int
    last_seen_frame: int
    first_seen_seconds: float
    last_seen_seconds: float
    zone: str
    alert_emitted: bool = False
    missing_frames: int = 0


class EventLifecycleManager:
    def __init__(self) -> None:
        self._active_tracks: dict[tuple[int, int], _TrackLifecycleState] = {}
        self._rearm_until_seconds: dict[tuple[int, int], float] = {}

    def observe_lingering(
        self,
        *,
        camera_id: int,
        tracked_objects: list[TrackedObject],
        frame_index: int,
        elapsed_seconds: float,
        threshold_seconds: int,
        rearm_seconds: int,
        exit_grace_frames: int,
    ) -> list[dict[str, Any]]:
        events: list[dict[str, Any]] = []
        seen_tracks: set[tuple[int, int]] = set()

        for track in tracked_objects:
            key = (camera_id, track.track_id)
            seen_tracks.add(key)

            cooldown_until = self._rearm_until_seconds.get(key, 0.0)
            if key not in self._active_tracks and elapsed_seconds < cooldown_until:
                continue

            state = self._active_tracks.get(key)
            if state is None:
                state = _TrackLifecycleState(
                    track_id=track.track_id,
                    first_seen_frame=frame_index,
                    last_seen_frame=frame_index,
                    first_seen_seconds=elapsed_seconds,
                    last_seen_seconds=elapsed_seconds,
                    zone=track.zone,
                )
                self._active_tracks[key] = state
            else:
                state.last_seen_frame = frame_index
                state.last_seen_seconds = elapsed_seconds
                state.zone = track.zone

            state.missing_frames = 0

            active_duration = max(0.0, state.last_seen_seconds - state.first_seen_seconds)
            if not state.alert_emitted and active_duration >= threshold_seconds:
                state.alert_emitted = True
                events.append(
                    {
                        "event_type": "suspicious_lingering",
                        "severity": "medium",
                        "timestamp": datetime.now(timezone.utc),
                        "metadata": {
                            "track_id": track.track_id,
                            "track_ids": [track.track_id],
                            "camera_id": camera_id,
                            "first_seen_frame": state.first_seen_frame,
                            "last_seen_frame": state.last_seen_frame,
                            "duration_seconds": round(active_duration, 2),
                            "linger_seconds": threshold_seconds,
                            "rearm_seconds": rearm_seconds,
                            "zone": track.zone,
                            "continuous": True,
                            "lifecycle_state": "triggered",
                        },
                    }
                )

        for key, state in list(self._active_tracks.items()):
            if key in seen_tracks:
                continue

            state.missing_frames += 1
            if state.missing_frames < exit_grace_frames:
                continue

            if state.alert_emitted:
                self._rearm_until_seconds[key] = max(
                    self._rearm_until_seconds.get(key, 0.0),
                    state.last_seen_seconds + rearm_seconds,
                )

            self._active_tracks.pop(key, None)

        self._cleanup_expired_cooldowns(elapsed_seconds)
        return events

    def _cleanup_expired_cooldowns(self, elapsed_seconds: float) -> None:
        for key, cooldown_until in list(self._rearm_until_seconds.items()):
            if elapsed_seconds >= cooldown_until:
                self._rearm_until_seconds.pop(key, None)