from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any


_last_emitted: dict[tuple[int, str, str], datetime] = {}
_lock = asyncio.Lock()
_cleanup_counter = 0


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _build_keys(camera_id: int, event_type: str, metadata: dict[str, Any]) -> list[tuple[int, str, str]]:
    track_ids = metadata.get("track_ids") or metadata.get("track_id")
    if track_ids is None:
        return [(camera_id, event_type, "camera")]

    if not isinstance(track_ids, list):
        track_ids = [track_ids]

    normalized = sorted({str(track_id) for track_id in track_ids})
    return [(camera_id, event_type, track_id) for track_id in normalized]


def _cleanup_expired(now: datetime, cooldown_seconds: int) -> None:
    expired_after = cooldown_seconds * 5
    for key, last_emitted in list(_last_emitted.items()):
        if (now - last_emitted).total_seconds() > expired_after:
            _last_emitted.pop(key, None)


async def filter_event_by_cooldown(camera_id: int, event_type: str, metadata: dict[str, Any], cooldown_seconds: int) -> dict[str, Any] | None:
    now = _utc_now()
    keys = _build_keys(camera_id, event_type, metadata)

    async with _lock:
        global _cleanup_counter
        _cleanup_counter += 1
        if _cleanup_counter % 25 == 0:
            _cleanup_expired(now, cooldown_seconds)

        eligible_track_ids: list[str] = []
        eligible_keys: list[tuple[int, str, str]] = []

        for key in keys:
            last_emitted = _last_emitted.get(key)
            if last_emitted is None or (now - last_emitted).total_seconds() >= cooldown_seconds:
                eligible_keys.append(key)
                eligible_track_ids.append(key[2])

        if not eligible_keys:
            return None

        for key in eligible_keys:
            _last_emitted[key] = now

    filtered_metadata = dict(metadata)
    if "track_ids" in filtered_metadata:
        original_track_ids = filtered_metadata.get("track_ids") or []
        if not isinstance(original_track_ids, list):
            original_track_ids = [original_track_ids]
        filtered_metadata["track_ids"] = [track_id for track_id in original_track_ids if str(track_id) in eligible_track_ids]

    return filtered_metadata