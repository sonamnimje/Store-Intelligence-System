from __future__ import annotations

import math

import cv2
import numpy as np


def build_demo_visualization(analytics: dict) -> np.ndarray:
    canvas = np.zeros((720, 1280, 3), dtype=np.uint8)
    canvas[:] = (15, 23, 42)

    # Store floor plane and restricted zone.
    cv2.rectangle(canvas, (80, 100), (1200, 620), (23, 35, 57), thickness=-1)
    cv2.rectangle(canvas, (900, 160), (1160, 340), (35, 18, 18), thickness=2)
    cv2.putText(canvas, "Restricted Zone", (920, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (120, 120, 255), 2)

    people_count = int(analytics.get("people_count", 0))
    density = float(analytics.get("density", 0.0))
    dwell_time = float(analytics.get("dwell_time", 0.0))
    zone_counts = analytics.get("zone_counts", {}) or {}

    # Heat spots.
    for index in range(max(1, people_count)):
        center_x = 180 + (index * 95) % 900
        center_y = 200 + (index * 57) % 350
        color_strength = min(255, 80 + int(density * 300))
        cv2.circle(canvas, (center_x, center_y), 48, (0, color_strength, 255), thickness=-1)
        cv2.circle(canvas, (center_x, center_y), 22, (255, 255, 255), thickness=2)

        if index > 0:
            prev_x = 180 + ((index - 1) * 95) % 900
            prev_y = 200 + ((index - 1) * 57) % 350
            cv2.line(canvas, (prev_x, prev_y), (center_x, center_y), (56, 189, 248), 2)

    overlay = canvas.copy()
    cv2.rectangle(overlay, (80, 650), (1200, 705), (7, 12, 24), thickness=-1)
    cv2.addWeighted(overlay, 0.7, canvas, 0.3, 0, canvas)

    cv2.putText(canvas, f"Real-time people count: {people_count}", (100, 690), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
    cv2.putText(canvas, f"Density: {int(density * 100)}%  Dwell: {dwell_time:.1f}s", (480, 690), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (148, 163, 184), 2)
    cv2.putText(canvas, f"Main zone: {zone_counts.get('main', 0)}  Restricted: {zone_counts.get('restricted', 0)}", (845, 690), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (148, 163, 184), 2)

    return canvas


def encode_png(frame: np.ndarray) -> bytes:
    ok, buffer = cv2.imencode(".png", frame)
    if not ok:
        raise ValueError("Failed to encode visualization frame")
    return buffer.tobytes()