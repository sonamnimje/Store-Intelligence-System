from __future__ import annotations

from collections.abc import Callable
from time import perf_counter
from typing import Any
from uuid import uuid4

from fastapi import Request
from fastapi.responses import JSONResponse


def create_metrics_state() -> dict[str, Any]:
    return {
        "requests_total": 0,
        "requests_by_path": {},
        "requests_by_status": {},
        "request_durations_ms": [],
        "errors_total": 0,
    }


async def request_timing_middleware(request: Request, call_next: Callable):
    request_id = request.headers.get("x-request-id") or str(uuid4())
    start = perf_counter()

    try:
        response = await call_next(request)
        duration_ms = round((perf_counter() - start) * 1000, 2)
        metrics = request.app.state.metrics
        metrics["requests_total"] += 1
        metrics["request_durations_ms"].append(duration_ms)
        metrics["requests_by_path"][request.url.path] = metrics["requests_by_path"].get(request.url.path, 0) + 1
        metrics["requests_by_status"][response.status_code] = metrics["requests_by_status"].get(response.status_code, 0) + 1
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-ms"] = str(duration_ms)
        return response
    except Exception as exc:
        duration_ms = round((perf_counter() - start) * 1000, 2)
        metrics = request.app.state.metrics
        metrics["requests_total"] += 1
        metrics["errors_total"] += 1
        metrics["request_durations_ms"].append(duration_ms)
        raise exc


async def generic_exception_handler(request: Request, exc: Exception):
    request.app.state.metrics["errors_total"] += 1
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "request_id": request.headers.get("x-request-id")},
    )


def metrics_snapshot(metrics_state: dict[str, Any]) -> dict[str, Any]:
    durations = metrics_state["request_durations_ms"]
    average = round(sum(durations) / len(durations), 2) if durations else 0.0
    return {
        "requests_total": metrics_state["requests_total"],
        "errors_total": metrics_state["errors_total"],
        "average_response_time_ms": average,
        "requests_by_path": metrics_state["requests_by_path"],
        "requests_by_status": metrics_state["requests_by_status"],
    }