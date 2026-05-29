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
                "event_type": "crowding",
                "severity": "high",
                "timestamp": now,
                "metadata": {
                    "people_count": summary.people_count,
                    "threshold": overcrowd_threshold,
                    "track_ids": summary.active_track_ids,
                },
            }
        )

    if summary.restricted_zone_ids:
        events.append(
            {
                "event_type": "theft_risk",
                "severity": "high",
                "timestamp": now,
                "metadata": {"track_ids": summary.restricted_zone_ids},
            }
        )

    if summary.unusual_motion_ids:
        events.append(
            {
                "event_type": "unusual_activity",
                "severity": "low",
                "timestamp": now,
                "metadata": {"track_ids": summary.unusual_motion_ids},
            }
        )

    return events