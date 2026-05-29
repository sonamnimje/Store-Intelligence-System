# Store Intelligence System

An AI-powered store intelligence MVP for CCTV footage, live video streams, and real-time dashboard monitoring.

## Problem Statement

Retail stores need a practical way to understand crowd flow, detect operational risk, and monitor camera feeds in real time. This project turns store footage into live analytics, alerts, and a dashboard view without requiring model training or a distributed platform.

## Features

- Dashboard video upload with automatic AI processing
- Pretrained YOLOv8 person detection
- ByteTrack-style multi-object tracking
- Live WebSocket alerts and analytics updates
- Event history with JSON and CSV export
- Camera monitoring with processing status and FPS
- Heatmap and AI pipeline preview for demos
- Sample demo data and seeded dashboard mode

## Tech Stack

- Backend: FastAPI, async SQLAlchemy, WebSockets
- AI: OpenCV, YOLOv8, ByteTrack-style tracking, rule-based anomaly detection
- Frontend: React, Vite, TailwindCSS, Recharts
- Database: SQLite for local dev, PostgreSQL for Docker and production
- Deployment: Docker Compose and startup scripts

## System Architecture

```text
Camera / Upload --> FastAPI ingestion --> AI pipeline --> Rules engine --> Database
                                         \-> WebSocket stream --> React dashboard
```

FastAPI owns the API, background processing, and WebSocket fanout. The AI logic stays isolated in `ai_engine/` so the detector, tracker, and visualization helpers can evolve without changing the API contract.

See [docs/architecture.md](docs/architecture.md) for the detailed diagram and data flow.

## AI Pipeline

- Frame ingestion is handled with OpenCV.
- YOLOv8 detects people in each frame.
- The tracker keeps stable IDs across frames.
- The rules engine derives overcrowding, lingering, restricted-zone entry, unusual movement, and density alerts.
- The preview endpoint renders a visual demo frame with zones, paths, heat intensity, and people count.

## Folder Layout

```text
store-intelligence-system/
├── backend/
├── frontend/
├── ai_engine/
├── ai-engine/
├── sample_data/
├── scripts/
├── docs/
├── docker/
├── architecture.png
└── requirements.txt
```

## Local Setup

### 1. Create Environment

```bash
python -m venv .venv
.venv\Scripts\activate
```

### 2. Install Requirements

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Copy [.env.example](.env.example) to `.env` and adjust values as needed.

Important variables:

- `DATABASE_URL` - SQLite or PostgreSQL connection string.
- `ALLOWED_ORIGINS` - JSON list of frontend origins allowed by CORS.
- `YOLO_MODEL` - Pretrained YOLOv8 model path or name.
- `EVENT_OVERCROWD_THRESHOLD` - People count threshold for overcrowding.
- `EVENT_LINGER_SECONDS` - Linger threshold in seconds.
- `EVENT_DENSITY_THRESHOLD` - Crowd density threshold.
- `DEMO_MODE` - Seeds demo analytics and event history on startup.

### 4. Run Backend

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Backend endpoints:

- Swagger UI: http://localhost:8000/docs
- Health: http://localhost:8000/health
- Metrics: http://localhost:8000/metrics

### 5. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173.

## Docker Setup

### One-Command Startup

```bash
docker compose up --build
```

### Services

- `db` - PostgreSQL 16
- `backend` - FastAPI API and WebSocket server
- `frontend` - React dashboard

The compose stack uses a shared default network, so the backend can reach PostgreSQL as `db` and the frontend can reach the backend on `http://backend:8000` inside the container network.

### Startup Scripts

- Windows Docker: `scripts/start-docker.ps1`
- Linux/macOS Docker: `scripts/start-docker.sh`
- Windows local dev: `scripts/start-local.ps1`
- Linux/macOS local dev: `scripts/start-local.sh`

## API Endpoints

- `GET /` - service status
- `GET /health` - health check
- `GET /metrics` - request counts and latency summary
- `POST /upload-video` - upload and queue a video for AI processing
- `GET /processing-status/{task_id}` - job status for the uploaded video
- `GET /events` - event history
- `GET /analytics` - live analytics snapshot
- `GET /alerts` - active and historical alerts
- `GET /camera-status` - camera health and pipeline state
- `GET /demo-visualization` - demo pipeline preview image

## WebSocket Events

WebSocket endpoint: `/ws/live`

Event types:

- `ready` - connection established
- `job_status` - queued, processing, completed, or failed upload job state
- `analytics` - live people count, density, dwell time, and zone counts
- `alert` - new crowding or anomaly alert

## Demo Instructions

1. Start the backend and frontend or run `docker compose up --build`.
2. Open the dashboard and confirm the seeded analytics and event history are visible.
3. Upload a sample video from `sample_data/videos/` or any short CCTV clip.
4. Watch live job status, alerts, and analytics update in the dashboard.
5. Open `sample_data/screenshots/` and add exported UI captures for presentation materials.

## Demo Assets

The `sample_data/` folder contains placeholder references for quick demos:

- `sample_data/videos/` - reusable sample upload references
- `sample_data/screenshots/` - README-friendly screenshot placeholders
- `sample_data/seeds/` - seeded analytics and event data for demo mode

## Engineering Trade-offs

- The tracker is a lightweight adapter to keep the MVP portable and deterministic.
- Dwell time and zone analytics are rule-based signals layered on top of detection/tracking.
- Job state is in-memory for demo simplicity; a shared store can be added later if multi-worker deployment is needed.
- SQLite is best for local work; PostgreSQL is the deployment target.

## Scalability Considerations

- Move job state and WebSocket fanout behind Redis when running multiple backend instances.
- Move video processing to a worker queue if upload volume increases.
- Replace heuristics with stronger anomaly models after the MVP is validated.

## Future Improvements

- Add user authentication and role-based access.
- Persist long-term metrics in time-series storage.
- Add dedicated camera configuration management.
- Replace the demo preview image with a live annotated frame stream.

## Screenshot Guidance

Add exported dashboard screenshots to `sample_data/screenshots/` and reference them in presentation decks or a separate docs page.