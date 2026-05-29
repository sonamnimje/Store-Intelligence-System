from __future__ import annotations

from dataclasses import dataclass

from ai_engine.detection.yolo_detector import Detection
from ai_engine.tracking.bytetrack_adapter import ByteTrackAdapter, TrackedObject


@dataclass(frozen=True)
class TrackSignature:
    camera_id: int
    track_ids: tuple[int, ...]

    @property
    def key(self) -> str:
        if not self.track_ids:
            return "camera"
        return "|".join(str(track_id) for track_id in self.track_ids)


class TrackerManager:
    def __init__(self) -> None:
        self._tracker = ByteTrackAdapter()

    def update(self, detections: list[Detection], frame_index: int) -> list[TrackedObject]:
        tracked = self._tracker.update(detections)
        for track in tracked:
            track.linger_frames += 1
            if frame_index % 60 == 0:
                track.zone = "restricted" if track.track_id % 5 == 0 else "main"
        return tracked

    @staticmethod
    def active_track_ids(tracked_objects: list[TrackedObject]) -> list[int]:
        return sorted({track.track_id for track in tracked_objects})

    @staticmethod
    def build_signature(camera_id: int, tracked_objects: list[TrackedObject]) -> TrackSignature:
        return TrackSignature(camera_id=camera_id, track_ids=tuple(TrackerManager.active_track_ids(tracked_objects)))

    @staticmethod
    def zone_counts(tracked_objects: list[TrackedObject]) -> dict[str, int]:
        counts = {"main": 0, "restricted": 0}
        for track in tracked_objects:
            counts[track.zone] = counts.get(track.zone, 0) + 1
        return counts

    @staticmethod
    def estimate_dwell_time(tracked_objects: list[TrackedObject]) -> float:
        return sum(max(1, track.linger_frames) * 0.4 for track in tracked_objects)