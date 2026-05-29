# API Documentation

## POST /upload-video

Uploads a video file and starts asynchronous analysis.

Request: multipart form field `file`

Response:

```json
{
  "task_id": "uuid",
  "status": "queued"
}
```

## GET /events

Returns the latest store events ordered by timestamp.

## GET /analytics

Returns aggregate metrics such as people count, alert totals, and density trends.

## GET /alerts

Returns active and historical alerts.

## GET /camera-status

Returns camera health and processing state.