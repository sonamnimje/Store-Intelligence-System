export type AlertItem = {
  // canonical API shape
  alert_id: string;
  timestamp: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  camera_id: number;
  metadata: Record<string, unknown>;
  // aliases/in-app fields used by UI components
  id?: string;
  type?: string;
  cameraId?: number;
  status?: 'active' | 'closed' | 'info' | string;
};

export type CameraItem = {
  // canonical API shape
  camera_id: number;
  name: string;
  stream_url: string; // placeholder url
  live: boolean;
  fps: number;
  active_people: number;
  detection_status: string;
  processing_status: string;
  // aliases/in-app fields used by UI components
  id?: number;
  stream?: string;
  people?: number;
  processing?: string;
  cameraId?: number;
};

export const sampleCameras: CameraItem[] = Array.from({ length: 6 }).map((_, i) => ({
  camera_id: i + 1,
  name: `Camera ${i + 1}`,
  stream_url: `/sample_frames/cam${(i % 4) + 1}.jpg`,
  live: i % 4 !== 3,
  fps: i % 4 !== 3 ? 24 : 0,
  active_people: Math.floor(Math.random() * 6),
  detection_status: i % 4 !== 3 ? 'running' : 'idle',
  processing_status: i % 4 !== 3 ? 'running' : 'stopped',
  // aliases
  id: i + 1,
  stream: `/sample_frames/cam${(i % 4) + 1}.jpg`,
  people: Math.floor(Math.random() * 6),
  processing: i % 4 !== 3 ? 'running' : 'stopped',
  cameraId: i + 1,
}));

export const initialAlerts: AlertItem[] = [
  { alert_id: 'a1', timestamp: new Date().toISOString(), message: 'Suspicious lingering', severity: 'medium', camera_id: 1, metadata: {}, id: 'a1', type: 'suspicious_lingering', cameraId: 1, status: 'active' },
  { alert_id: 'a2', timestamp: new Date().toISOString(), message: 'Restricted zone entry', severity: 'high', camera_id: 3, metadata: {}, id: 'a2', type: 'restricted_zone', cameraId: 3, status: 'active' },
  { alert_id: 'a3', timestamp: new Date().toISOString(), message: 'Crowd congestion', severity: 'medium', camera_id: 2, metadata: {}, id: 'a3', type: 'crowd_density', cameraId: 2, status: 'active' },
];

export function randomAlert(idSeed = 100): AlertItem {
  const severities: AlertItem['severity'][] = ['low', 'medium', 'high', 'critical'];
  const severity = severities[Math.floor(Math.random() * severities.length)];
  const cam = Math.floor(Math.random() * 6) + 1;
  return {
    alert_id: `r${idSeed}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    message: severity === 'critical' ? 'Critical alert' : 'Simulated alert',
    severity,
    camera_id: cam,
    metadata: {},
    // legacy aliases
    id: `r${idSeed}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'simulated',
    cameraId: cam,
    status: 'active',
  };
}

export const mockAnalytics = () => ({
  people_count: Math.floor(Math.random() * 30),
  density: Math.random(),
  trends: Array.from({ length: 12 }).map((_, i) => ({ label: `${i}:00`, value: Math.floor(Math.random() * 10), severity: 'info' })),
  camera_activity: sampleCameras.map((c) => ({ camera_id: c.id, value: c.people, status: c.processing, confidence: Math.random() })),
});
