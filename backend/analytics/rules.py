from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class DetectionSummary:
    camera_id: int
    people_count: int
    density: float
    dwell_time: float
    zone_counts: dict[str, int]
    lingering_ids: list[int]
    restricted_zone_ids: list[int]
    unusual_motion_ids: list[int]


def evaluate_events(summary: DetectionSummary, overcrowd_threshold: int, linger_seconds: int, density_threshold: float) -> list[dict]:
    now = datetime.now(timezone.utc)
    events: list[dict] = []

    if summary.people_count >= overcrowd_threshold:
        events.append(
            {
                "event_type": "overcrowding",
                "severity": "high",
                "timestamp": now,
                "metadata": {"people_count": summary.people_count, "threshold": overcrowd_threshold},
            }
        )

    if summary.density >= density_threshold:
        events.append(
            {
                "event_type": "high_customer_density",
                "severity": "medium",
                "timestamp": now,
                "metadata": {"density": summary.density, "threshold": density_threshold},
            }
        )

    if summary.restricted_zone_ids:
        events.append(
            {
                "event_type": "restricted_zone_entry",
                "severity": "high",
                "timestamp": now,
                "metadata": {"track_ids": summary.restricted_zone_ids},
            }
        )

    if summary.unusual_motion_ids:
        events.append(
            {
                "event_type": "unusual_movement",
                "severity": "low",
                "timestamp": now,
                "metadata": {"track_ids": summary.unusual_motion_ids},
            }
        )

    return events