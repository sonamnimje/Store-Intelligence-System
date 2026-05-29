export interface AnalyticsResponse {
  people_count: number;
  density: number;
  dwell_time: number;
  zone_counts: Record<string, number>;
  alerts: number;
  camera_id: number;
  updated_at: string;
  trends: Array<{ label: string; value: number; severity: string }>;
}

export interface AlertItem {
  alert_id: string;
  timestamp: string;
  message: string;
  severity: string;
  camera_id: number;
  metadata: Record<string, unknown>;
}

export interface EventItem {
  event_id: string;
  timestamp: string;
  event_type: string;
  severity: string;
  camera_id: number;
  metadata: Record<string, unknown>;
}

export interface CameraStatusItem {
  camera_id: number;
  name: string;
  status: string;
  stream_url: string;
  active_people: number;
  fps: number;
  detection_status: string;
  processing_status: string;
  live: boolean;
}

export interface UploadResponse {
  task_id: string;
  status: string;
}

export interface JobStatusItem {
  task_id: string;
  camera_id: number;
  filename: string;
  status: string;
  progress: number;
  message: string;
  started_at: string;
  updated_at: string;
}