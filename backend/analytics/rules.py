from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class DetectionSummary:
    camera_id: int
    people_count: int
    density: float
    dwell_time: float
    zone_counts: dict[str, int]
    active_track_ids: list[int] = field(default_factory=list)
    lingering_ids: list[int] = field(default_factory=list)
    restricted_zone_ids: list[int] = field(default_factory=list)
    unusual_motion_ids: list[int] = field(default_factory=list)


def evaluate_events(summary: DetectionSummary, overcrowd_threshold: int, linger_seconds: int, density_threshold: float) -> list[dict]:
    now = datetime.now(timezone.utc)
    events: list[dict] = []

    if summary.people_count >= overcrowd_threshold:
        events.append(
            {
                "event_type": "crowd_density",
                "severity": "high",
                "confidence": min(0.99, 0.75 + (summary.density * 0.2) + (summary.people_count / max(overcrowd_threshold, 1) * 0.05)),
                "timestamp": now,
                "metadata": {
                    "people_count": summary.people_count,
                    "threshold": overcrowd_threshold,
                    "track_ids": summary.active_track_ids,
                    "status": "active",
                },
            }
        )

    if summary.restricted_zone_ids:
        events.append(
            {
                "event_type": "restricted_zone",
                "severity": "high",
                "confidence": 0.96,
                "timestamp": now,
                "metadata": {"track_ids": summary.restricted_zone_ids, "status": "active"},
            }
        )

        events.append(
            {
                "event_type": "intrusion",
                "severity": "high",
                "confidence": 0.93,
                "timestamp": now,
                "metadata": {"track_ids": summary.restricted_zone_ids, "status": "active"},
            }
        )

    if summary.unusual_motion_ids:
        events.append(
            {
                "event_type": "abandoned_object",
                "severity": "low",
                "confidence": 0.72,
                "timestamp": now,
                "metadata": {"track_ids": summary.unusual_motion_ids, "status": "active"},
            }
        )

    return events