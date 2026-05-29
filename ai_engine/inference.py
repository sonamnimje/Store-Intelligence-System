from __future__ import annotations

from ai_engine.anomaly.detector import AnomalyDetector
from ai_engine.detection.yolo_detector import YoloDetector
from ai_engine.tracking.bytetrack_adapter import ByteTrackAdapter
from ai_engine.tracking.bytetrack_adapter import TrackedObject


class InferencePipeline:
    def __init__(self, model_name: str) -> None:
        self.detector = YoloDetector(model_name)
        self.tracker = ByteTrackAdapter()
        self.anomaly_detector = AnomalyDetector()

    def detect(self, frame, frame_index: int):
        return self.detector.detect(frame, frame_index)

    def track(self, detections, frame_index: int):
        tracked = self.tracker.update(detections)
        for track in tracked:
            track.linger_frames += 1
            if frame_index % 60 == 0:
                track.zone = "restricted" if track.track_id % 5 == 0 else "main"
        return tracked

    def estimate_density(self, frame, tracked_objects: list[TrackedObject]) -> float:
        return self.anomaly_detector.estimate_density(frame, tracked_objects)

    def find_lingering(self, tracked_objects: list[TrackedObject]) -> list[int]:
        return self.anomaly_detector.find_lingering(tracked_objects)

    def find_restricted_entries(self, tracked_objects: list[TrackedObject]) -> list[int]:
        return self.anomaly_detector.find_restricted_entries(tracked_objects)

    def find_unusual_motion(self, tracked_objects: list[TrackedObject]) -> list[int]:
        return self.anomaly_detector.find_unusual_motion(tracked_objects)

    def zone_counts(self, tracked_objects: list[TrackedObject]) -> dict[str, int]:
        return self.tracker.zone_counts(tracked_objects)

    def estimate_dwell_time(self, tracked_objects: list[TrackedObject]) -> float:
        return self.tracker.estimate_dwell_time(tracked_objects)


def create_pipeline(model_name: str) -> InferencePipeline:
    return InferencePipeline(model_name)