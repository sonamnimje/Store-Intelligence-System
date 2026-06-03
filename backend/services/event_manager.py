from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.analytics.rules import DetectionSummary, evaluate_events
from backend.models.entities import EventRecord
from backend.services.cooldown_manager import CooldownManager
from backend.services.tracker_manager import TrackerManager
from ai_engine.tracking.bytetrack_adapter import TrackedObject


@dataclass
class IncidentState:
    event_id: str
    event_key: str
    event_type: str
    severity: str
    camera_id: int
    track_key: str
    track_id: int | None
    track_ids: list[int]
    first_seen_at: datetime
    last_seen_at: datetime
    first_seen_frame: int
    last_seen_frame: int
    occurrence_count: int = 1
    confidence: float = 0.0
    duration_seconds: float = 0.0
    status: str = "active"
    dirty: bool = True


class EventManager:
    def __init__(self) -> None:
        self.cooldown_manager = CooldownManager()
        self.tracker_manager = TrackerManager()
        self._active_incidents: dict[str, IncidentState] = {}
        self._lingering_tracks: dict[tuple[int, int], dict[str, Any]] = {}
        self._current_frame_keys: set[str] = set()
        self._last_flush_frame = 0

    def build_event_key(self, camera_id: int, event_type: str, track_key: str) -> str:
        return f"{camera_id}:{event_type}:{track_key}"

    async def evaluate_frame(
        self,
        session: AsyncSession,
        *,
        camera_id: int,
        frame_index: int,
        elapsed_seconds: float,
        tracked_objects: list[TrackedObject],
        summary: DetectionSummary,
        overcrowd_threshold: int,
        linger_seconds: int,
        density_threshold: float,
        crowding_cooldown_seconds: int,
        theft_risk_cooldown_seconds: int,
        unusual_activity_cooldown_seconds: int,
        lingering_cooldown_seconds: int,
        exit_grace_frames: int,
    ) -> list[dict[str, Any]]:
        self._current_frame_keys = set()
        emitted_events: list[dict[str, Any]] = []
        now = datetime.now(timezone.utc)

        emitted_events.extend(
            self._evaluate_lingering(
                camera_id=camera_id,
                tracked_objects=tracked_objects,
                frame_index=frame_index,
                elapsed_seconds=elapsed_seconds,
                linger_seconds=linger_seconds,
                lingering_cooldown_seconds=lingering_cooldown_seconds,
                exit_grace_frames=exit_grace_frames,
                timestamp=now,
            )
        )

        rule_events = evaluate_events(summary, overcrowd_threshold, linger_seconds, density_threshold)
        for event in rule_events:
            emitted_events.extend(
                self._handle_rule_event(
                    camera_id=camera_id,
                    event=event,
                    tracked_objects=tracked_objects,
                    frame_index=frame_index,
                    cooldown_seconds={
                        "crowding": crowding_cooldown_seconds,
                        "theft_risk": theft_risk_cooldown_seconds,
                        "unusual_activity": unusual_activity_cooldown_seconds,
                    }[event["event_type"]],
                    timestamp=now,
                )
            )

        emitted_events.extend(self._close_missing_incidents(camera_id=camera_id, tracked_objects=tracked_objects, timestamp=now))

        if frame_index - self._last_flush_frame >= 30:
            await self.flush_active_incidents(session)
            self._last_flush_frame = frame_index

        return emitted_events

    async def flush_active_incidents(self, session: AsyncSession) -> None:
        for incident in self._active_incidents.values():
            if not incident.dirty:
                continue

            duration_seconds = max(0.0, (incident.last_seen_at - incident.first_seen_at).total_seconds())
            await session.execute(
                update(EventRecord)
                .where(EventRecord.event_id == incident.event_id)
                .values(
                    last_seen_at=incident.last_seen_at,
                    occurrence_count=incident.occurrence_count,
                    is_active=True,
                        confidence=incident.confidence,
                        duration_seconds=duration_seconds,
                        status=incident.status,
                    event_metadata={
                        "track_id": incident.track_id,
                        "track_key": incident.track_key,
                        "track_ids": incident.track_ids,
                        "first_seen_at": incident.first_seen_at.isoformat(),
                        "last_seen_at": incident.last_seen_at.isoformat(),
                        "duration_seconds": round(duration_seconds, 2),
                        "occurrence_count": incident.occurrence_count,
                        "lifecycle_state": "active",
                    },
                )
            )
            incident.dirty = False

    async def close_all(self, session: AsyncSession) -> None:
        for event_key, incident in list(self._active_incidents.items()):
            await session.execute(
                update(EventRecord)
                .where(EventRecord.event_id == incident.event_id)
                .values(
                    last_seen_at=incident.last_seen_at,
                    occurrence_count=incident.occurrence_count,
                    is_active=False,
                        confidence=incident.confidence,
                        duration_seconds=max(0.0, (incident.last_seen_at - incident.first_seen_at).total_seconds()),
                        status="closed",
                    event_metadata={
                        "track_id": incident.track_id,
                        "track_key": incident.track_key,
                        "track_ids": incident.track_ids,
                        "first_seen_at": incident.first_seen_at.isoformat(),
                        "last_seen_at": incident.last_seen_at.isoformat(),
                        "duration_seconds": round(max(0.0, (incident.last_seen_at - incident.first_seen_at).total_seconds()), 2),
                        "occurrence_count": incident.occurrence_count,
                        "lifecycle_state": "closed",
                    },
                )
            )
            self.cooldown_manager.release(incident.camera_id, incident.event_type, incident.track_key)
            self._active_incidents.pop(event_key, None)

    def _evaluate_lingering(
        self,
        *,
        camera_id: int,
        tracked_objects: list[TrackedObject],
        frame_index: int,
        elapsed_seconds: float,
        linger_seconds: int,
        lingering_cooldown_seconds: int,
        exit_grace_frames: int,
        timestamp: datetime,
    ) -> list[dict[str, Any]]:
        emitted: list[dict[str, Any]] = []
        seen_keys: set[str] = set()

        for track in tracked_objects:
            key = (camera_id, track.track_id)
            state = self._lingering_tracks.get(key)
            if state is None:
                state = {
                    "first_seen_at": timestamp,
                    "first_seen_seconds": elapsed_seconds,
                    "last_seen_seconds": elapsed_seconds,
                    "first_seen_frame": frame_index,
                    "last_seen_frame": frame_index,
                    "missing_frames": 0,
                    "emitted": False,
                    "event_id": None,
                }
                self._lingering_tracks[key] = state
            else:
                state["last_seen_seconds"] = elapsed_seconds
                state["last_seen_frame"] = frame_index
                state["missing_frames"] = 0

            active_duration = max(0.0, state["last_seen_seconds"] - state["first_seen_seconds"])
            event_key = self.build_event_key(camera_id, "suspicious_lingering", str(track.track_id))
            seen_keys.add(event_key)

            if active_duration < linger_seconds:
                continue

            if state["emitted"]:
                self._touch_active_incident(
                    event_key=event_key,
                    timestamp=timestamp,
                    track=track,
                    duration_seconds=active_duration,
                )
                continue

            if not self.cooldown_manager.should_emit(camera_id, "suspicious_lingering", str(track.track_id), "medium", lingering_cooldown_seconds):
                continue

            event_id = str(uuid4())
            state["emitted"] = True
            state["event_id"] = event_id
            incident = IncidentState(
                event_id=event_id,
                event_key=event_key,
                event_type="suspicious_lingering",
                severity="medium",
                camera_id=camera_id,
                track_key=str(track.track_id),
                track_id=track.track_id,
                track_ids=[track.track_id],
                first_seen_at=state["first_seen_at"],
                last_seen_at=timestamp,
                first_seen_frame=state["first_seen_frame"],
                last_seen_frame=frame_index,
                confidence=min(0.99, 0.6 + (active_duration / max(linger_seconds, 1)) * 0.4),
                duration_seconds=active_duration,
                status="active",
            )
            self._active_incidents[event_key] = incident
            self.cooldown_manager.mark_emitted(camera_id, "suspicious_lingering", str(track.track_id), "medium", event_id)
            emitted.append(
                {
                    "action": "create",
                    "event_id": event_id,
                    "event_key": event_key,
                    "event_type": "suspicious_lingering",
                    "severity": "medium",
                    "camera_id": camera_id,
                    "timestamp": timestamp,
                    "track_id": track.track_id,
                    "track_key": str(track.track_id),
                    "track_ids": [track.track_id],
                    "metadata": {
                        "track_id": track.track_id,
                        "track_key": str(track.track_id),
                        "track_ids": [track.track_id],
                        "first_seen_frame": state["first_seen_frame"],
                        "last_seen_frame": frame_index,
                        "first_seen_at": state["first_seen_at"].isoformat(),
                        "last_seen_at": timestamp.isoformat(),
                        "duration_seconds": round(active_duration, 2),
                        "linger_seconds": linger_seconds,
                        "confidence": round(min(0.99, 0.6 + (active_duration / max(linger_seconds, 1)) * 0.4), 2),
                        "status": "active",
                        "continuous": True,
                        "lifecycle_state": "triggered",
                    },
                }
            )

        for key, state in list(self._lingering_tracks.items()):
            if key in {(camera_id, track.track_id) for track in tracked_objects}:
                continue

            state["missing_frames"] += 1
            if state["missing_frames"] < exit_grace_frames:
                continue

            event_key = self.build_event_key(camera_id, "suspicious_lingering", str(key[1]))
            incident = self._active_incidents.get(event_key)
            if incident is not None:
                incident.last_seen_at = timestamp
                incident.last_seen_frame = frame_index
                incident.dirty = True
                emitted.append(
                    {
                        "action": "close",
                        "event_id": incident.event_id,
                        "event_key": event_key,
                        "event_type": incident.event_type,
                        "severity": incident.severity,
                        "camera_id": camera_id,
                        "timestamp": timestamp,
                        "track_id": incident.track_id,
                        "track_key": incident.track_key,
                        "track_ids": incident.track_ids,
                        "metadata": {
                            "track_id": incident.track_id,
                            "track_key": incident.track_key,
                            "track_ids": incident.track_ids,
                            "first_seen_at": incident.first_seen_at.isoformat(),
                            "last_seen_at": timestamp.isoformat(),
                            "duration_seconds": round(max(0.0, (timestamp - incident.first_seen_at).total_seconds()), 2),
                            "occurrence_count": incident.occurrence_count,
                            "confidence": round(incident.confidence, 2),
                            "status": "closed",
                            "lifecycle_state": "closed",
                        },
                    }
                )
                self._active_incidents.pop(event_key, None)
            self._lingering_tracks.pop(key, None)
            self.cooldown_manager.release(camera_id, "suspicious_lingering", str(key[1]))

        return emitted

    def _handle_rule_event(
        self,
        *,
        camera_id: int,
        event: dict[str, Any],
        tracked_objects: list[TrackedObject],
        frame_index: int,
        cooldown_seconds: int,
        timestamp: datetime,
    ) -> list[dict[str, Any]]:
        metadata = dict(event["metadata"])
        track_ids = metadata.get("track_ids") or []
        if not isinstance(track_ids, list):
            track_ids = [track_ids]
        normalized_track_ids = sorted({int(track_id) for track_id in track_ids if str(track_id).isdigit()})
        event_type = self._normalize_event_type(event["event_type"])
        track_key = "camera" if event_type == "crowd_density" else ("|".join(str(track_id) for track_id in normalized_track_ids) if normalized_track_ids else "camera")
        event_key = self.build_event_key(camera_id, event_type, track_key)

        self._current_frame_keys.add(event_key)
        incident = self._active_incidents.get(event_key)

        if incident is not None:
            incident.last_seen_at = timestamp
            incident.last_seen_frame = frame_index
            incident.occurrence_count += 1
            incident.duration_seconds = max(0.0, (timestamp - incident.first_seen_at).total_seconds())
            incident.dirty = True
            return []

        severity = event["severity"]
        if not self.cooldown_manager.should_emit(camera_id, event_type, track_key, severity, cooldown_seconds):
            return []

        event_id = str(uuid4())
        representative_track_id = normalized_track_ids[0] if normalized_track_ids else None
        incident = IncidentState(
            event_id=event_id,
            event_key=event_key,
            event_type=event_type,
            severity=severity,
            camera_id=camera_id,
            track_key=track_key,
            track_id=representative_track_id,
            track_ids=normalized_track_ids,
            first_seen_at=timestamp,
            last_seen_at=timestamp,
            first_seen_frame=frame_index,
            last_seen_frame=frame_index,
            confidence=float(event.get("confidence", 0.85)),
            duration_seconds=0.0,
            status="active",
        )
        self._active_incidents[event_key] = incident
        self.cooldown_manager.mark_emitted(camera_id, event_type, track_key, severity, event_id)

        return [
            {
                "action": "create",
                "event_id": event_id,
                "event_key": event_key,
                "event_type": event_type,
                "severity": severity,
                "camera_id": camera_id,
                "timestamp": timestamp,
                "track_id": representative_track_id,
                "track_key": track_key,
                "track_ids": normalized_track_ids,
                "metadata": {
                    **metadata,
                    "track_id": representative_track_id,
                    "track_key": track_key,
                    "track_ids": normalized_track_ids,
                    "first_seen_at": timestamp.isoformat(),
                    "last_seen_at": timestamp.isoformat(),
                    "occurrence_count": 1,
                    "confidence": round(float(event.get("confidence", 0.85)), 2),
                    "status": "active",
                    "lifecycle_state": "triggered",
                },
            }
        ]

    def _close_missing_incidents(self, *, camera_id: int, tracked_objects: list[TrackedObject], timestamp: datetime) -> list[dict[str, Any]]:
        active_track_ids = {track.track_id for track in tracked_objects}
        closed: list[dict[str, Any]] = []

        for event_key, incident in list(self._active_incidents.items()):
            if incident.event_type == "suspicious_lingering":
                continue

            if incident.track_id is not None and incident.track_id in active_track_ids:
                continue

            if incident.track_id is None and incident.track_ids and active_track_ids.intersection(incident.track_ids):
                continue

            incident.last_seen_at = timestamp
            incident.last_seen_frame = incident.last_seen_frame
            incident.duration_seconds = max(0.0, (timestamp - incident.first_seen_at).total_seconds())
            incident.status = "closed"
            incident.dirty = True
            closed.append(
                {
                    "action": "close",
                    "event_id": incident.event_id,
                    "event_key": event_key,
                    "event_type": incident.event_type,
                    "severity": incident.severity,
                    "camera_id": camera_id,
                    "timestamp": timestamp,
                    "track_id": incident.track_id,
                    "track_key": incident.track_key,
                    "track_ids": incident.track_ids,
                    "metadata": {
                        "track_id": incident.track_id,
                        "track_key": incident.track_key,
                        "track_ids": incident.track_ids,
                        "first_seen_at": incident.first_seen_at.isoformat(),
                        "last_seen_at": timestamp.isoformat(),
                        "occurrence_count": incident.occurrence_count,
                        "confidence": round(incident.confidence, 2),
                        "status": "closed",
                        "lifecycle_state": "closed",
                    },
                }
            )
            self._active_incidents.pop(event_key, None)
            self.cooldown_manager.release(camera_id, incident.event_type, incident.track_key)

        return closed

    def _touch_active_incident(self, *, event_key: str, timestamp: datetime, track: TrackedObject, duration_seconds: float) -> None:
        incident = self._active_incidents.get(event_key)
        if incident is None:
            return
        incident.last_seen_at = timestamp
        incident.last_seen_frame += 1
        incident.occurrence_count += 1
        incident.dirty = True

    @staticmethod
    def _normalize_event_type(event_type: str) -> str:
        mapping = {
            "overcrowding": "crowd_density",
            "high_customer_density": "crowd_density",
            "restricted_zone_entry": "intrusion",
            "theft_risk": "intrusion",
            "unusual_movement": "abandoned_object",
            "unusual_activity": "abandoned_object",
            "crowding": "crowd_density",
        }
        return mapping.get(event_type, event_type)