import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchAlerts, fetchAnalytics, fetchCameraStatus, fetchEvents, fetchProcessingStatus, uploadVideo } from './services/api';
import { connectLiveFeed } from './services/socket';
import { DashboardPage, type ToastItem } from './pages/DashboardPage';
import type { AlertItem, AnalyticsResponse, CameraStatusItem, EventItem, JobStatusItem } from './types/api';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000';

type ActiveAlert = AlertItem & {
  received_at: number;
};

const ALERT_ACTIVE_TTL_MS = 45_000;
const ALERT_DUPLICATE_COOLDOWN_MS = 12_000;

function App() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [cameras, setCameras] = useState<CameraStatusItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('Choose a CCTV recording to start analysis.');
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const alertCooldownRef = useRef<Map<string, number>>(new Map());
  const alertExpiryTimersRef = useRef<Map<string, number>>(new Map());

  function pushToast(title: string, message: string, tone: ToastItem['tone'] = 'info') {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, title, message, tone }].slice(-4));
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }

  function buildAlertKey(alert: Partial<AlertItem> & { event_type?: string }) {
    const metadata = (alert.metadata ?? {}) as Record<string, unknown>;
    const trackIds = metadata.track_ids ?? metadata.track_id;
    const normalizedTrackIds = Array.isArray(trackIds) ? [...trackIds].map(String).sort().join('|') : trackIds ? String(trackIds) : 'camera';
    const label = (alert.message ?? alert.event_type ?? 'alert').toLowerCase();
    return [alert.camera_id ?? 1, label, normalizedTrackIds].join(':');
  }

  function scheduleAlertExpiry(alertId: string) {
    const existingTimer = alertExpiryTimersRef.current.get(alertId);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    const timerId = window.setTimeout(() => {
      setAlerts((current) => current.filter((alert) => alert.alert_id !== alertId));
      alertExpiryTimersRef.current.delete(alertId);
    }, ALERT_ACTIVE_TTL_MS);

    alertExpiryTimersRef.current.set(alertId, timerId);
  }

  function ingestAlert(alert: AlertItem, receivedAt = Date.now()) {
    const alertKey = buildAlertKey(alert);
    const lastSeen = alertCooldownRef.current.get(alertKey) ?? 0;

    if (receivedAt - lastSeen < ALERT_DUPLICATE_COOLDOWN_MS) {
      return;
    }

    alertCooldownRef.current.set(alertKey, receivedAt);

    const activeAlert: ActiveAlert = {
      ...alert,
      received_at: receivedAt,
      alert_id: alert.alert_id || crypto.randomUUID(),
    };

    setAlerts((current) => {
      const next = [activeAlert, ...current.filter((item) => buildAlertKey(item) !== alertKey)].slice(0, 10);
      return next;
    });

    scheduleAlertExpiry(activeAlert.alert_id);
  }

  async function refreshDashboard() {
    setIsRefreshing(true);
    try {
      const [nextAnalytics, nextAlerts, nextEvents, nextCameras] = await Promise.all([fetchAnalytics(), fetchAlerts(), fetchEvents(), fetchCameraStatus()]);
      setAnalytics(nextAnalytics);
      nextAlerts.slice(0, 10).forEach((alert) => ingestAlert(alert, Date.now()));
      setEvents(nextEvents);
      setCameras(nextCameras);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    refreshDashboard();

    const disconnect = connectLiveFeed((message) => {
      if (message.type === 'analytics') {
        setAnalytics((current) => ({ ...(current ?? analytics ?? {}), ...message.payload } as AnalyticsResponse));
      }

      if (message.type === 'alert') {
        ingestAlert({ ...message.payload, alert_id: message.payload.alert_id ?? crypto.randomUUID() } as AlertItem);
        pushToast('Live alert', message.payload.message ?? 'New alert detected', message.payload.severity === 'high' ? 'danger' : 'warning');
      }

      if (message.type === 'job_status') {
        setUploadStatus(message.payload.status ?? 'processing');
        setUploadProgress(message.payload.progress ?? 0);
        setUploadMessage(message.payload.message ?? 'Processing video');

        if (message.payload.status === 'completed') {
          pushToast('Processing complete', 'The uploaded video finished analysis.', 'success');
          refreshDashboard();
        }

        if (message.payload.status === 'failed') {
          pushToast('Processing failed', message.payload.message ?? 'The video job failed.', 'danger');
        }
      }
    });

    return disconnect;
  }, []);

  useEffect(() => {
    if (!processingTaskId) {
      return;
    }

    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const status = await fetchProcessingStatus(processingTaskId);
        if (cancelled) {
          return;
        }

        setUploadStatus(status.status ?? 'processing');
        setUploadProgress(status.progress ?? 0);
        setUploadMessage(status.message ?? 'Processing video');

        if (status.status === 'completed' || status.status === 'failed') {
          window.clearInterval(timer);
          await refreshDashboard();
        }
      } catch {
        setUploadStatus('error');
        setUploadMessage('Unable to fetch processing status.');
        pushToast('Status unavailable', 'Could not fetch the current processing job.', 'warning');
      }
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [processingTaskId]);

  useEffect(() => {
    return () => {
      alertExpiryTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      alertExpiryTimersRef.current.clear();
    };
  }, []);

  async function handleUpload() {
    if (!selectedFile) {
      setUploadMessage('Select a video file first.');
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress(10);
    setUploadMessage('Uploading video to backend...');

    try {
      const response = await uploadVideo(selectedFile);
      setProcessingTaskId(response.task_id);
      setUploadStatus(response.status ?? 'queued');
      setUploadMessage('Video queued for AI processing.');
      setUploadProgress(15);
      pushToast('Upload queued', 'The backend started processing the video.', 'success');
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(error instanceof Error ? error.message : 'Upload failed');
      pushToast('Upload failed', error instanceof Error ? error.message : 'Upload failed', 'danger');
    }
  }

  const trendData = useMemo(() => analytics?.trends ?? [], [analytics]);

  return (
    <DashboardPage
      apiBase={API_BASE}
      analytics={analytics}
      alerts={alerts}
      cameras={cameras}
      events={events}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      uploadStatus={uploadStatus}
      uploadProgress={uploadProgress}
      uploadMessage={uploadMessage}
      selectedFile={selectedFile}
      trendData={trendData}
      toasts={toasts}
      onPickFile={setSelectedFile}
      onUpload={handleUpload}
      onRefresh={refreshDashboard}
    />
  );
}

export default App;