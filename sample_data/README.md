# Sample Data

This folder contains lightweight demo assets for quick evaluation.

## Structure

```text
sample_data/
├── screenshots/
├── seeds/
└── videos/
```

## Demo Video Reference

Place a sample CCTV clip in `sample_data/videos/` if you want a reusable demo upload.
The app does not require it for startup; it is only a convenient placeholder for demos.

## Seeded Demo Mode

The backend seeds example analytics, events, and alerts automatically when `DEMO_MODE=true`.
This keeps the dashboard populated immediately after a fresh setup.