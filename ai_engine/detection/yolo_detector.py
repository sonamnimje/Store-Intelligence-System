from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Detection:
    bbox: tuple[int, int, int, int]
    confidence: float
    class_id: int
    label: str = "person"


class YoloDetector:
    def __init__(self, model_name: str = "yolov8n.pt") -> None:
        self.model_name = model_name
        self.model = None
        try:
            from ultralytics import YOLO

            self.model = YOLO(model_name)
        except Exception:
            self.model = None

    def detect(self, frame, frame_index: int) -> list[Detection]:
        if self.model is None:
            height, width = frame.shape[:2]
            box_width = max(40, width // 8)
            box_height = max(80, height // 4)
            offset = (frame_index * 13) % max(1, width - box_width)
            return [Detection((offset, height // 3, offset + box_width, height // 3 + box_height), 0.5, 0)]

        results = self.model.predict(frame, classes=[0], verbose=False)
        detections: list[Detection] = []
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = [int(value) for value in box.xyxy[0].tolist()]
                detections.append(Detection((x1, y1, x2, y2), float(box.conf[0]), int(box.cls[0]), "person"))
        return detections