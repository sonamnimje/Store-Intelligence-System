from __future__ import annotations

from dataclasses import dataclass
from math import hypot

from ai_engine.detection.yolo_detector import Detection


@dataclass
class TrackedObject:
    track_id: int
    bbox: tuple[int, int, int, int]
    confidence: float
    center: tuple[int, int]
    age: int = 0
    linger_frames: int = 0
    zone: str = "main"


class ByteTrackAdapter:
    def __init__(self) -> None:
        self._next_id = 1
        self._tracks: dict[int, TrackedObject] = {}

    def update(self, detections: list[Detection]) -> list[TrackedObject]:
        updated: list[TrackedObject] = []
        for detection in detections:
            center = ((detection.bbox[0] + detection.bbox[2]) // 2, (detection.bbox[1] + detection.bbox[3]) // 2)
            match_id = self._match(center)
            if match_id is None:
                match_id = self._next_id
                self._next_id += 1

            track = TrackedObject(track_id=match_id, bbox=detection.bbox, confidence=detection.confidence, center=center)
            previous = self._tracks.get(match_id)
            if previous is not None:
                track.linger_frames = previous.linger_frames + 1
                track.zone = previous.zone
            self._tracks[match_id] = track
            updated.append(track)

        for track_id in list(self._tracks):
            if track_id not in {item.track_id for item in updated}:
                self._tracks[track_id].age += 1
                if self._tracks[track_id].age > 30:
                    self._tracks.pop(track_id)

        return updated

    def zone_counts(self, tracked_objects: list[TrackedObject]) -> dict[str, int]:
        counts = {"main": 0, "restricted": 0}
        for track in tracked_objects:
            counts[track.zone] = counts.get(track.zone, 0) + 1
        return counts

    def estimate_dwell_time(self, tracked_objects: list[TrackedObject]) -> float:
        return sum(max(1, track.linger_frames) * 0.4 for track in tracked_objects)

    def _match(self, center: tuple[int, int]) -> int | None:
        candidate: int | None = None
        distance = 80.0
        for track_id, track in self._tracks.items():
            current = hypot(track.center[0] - center[0], track.center[1] - center[1])
            if current < distance:
                candidate = track_id
                distance = current
        return candidate