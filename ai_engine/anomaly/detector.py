from __future__ import annotations

from ai_engine.tracking.bytetrack_adapter import TrackedObject


class AnomalyDetector:
    def estimate_density(self, frame, tracked_objects: list[TrackedObject]) -> float:
        height, width = frame.shape[:2]
        area = max(1, height * width)
        occupied = len(tracked_objects) * 2500
        return min(1.0, occupied / area)

    def find_lingering(self, tracked_objects: list[TrackedObject]) -> list[int]:
        return [track.track_id for track in tracked_objects if track.linger_frames > 90]

    def find_restricted_entries(self, tracked_objects: list[TrackedObject]) -> list[int]:
        return [track.track_id for track in tracked_objects if track.zone == "restricted"]

    def find_unusual_motion(self, tracked_objects: list[TrackedObject]) -> list[int]:
        return [track.track_id for track in tracked_objects if track.age % 25 == 0 and track.age > 0]