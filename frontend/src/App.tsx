import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ChevronRight, Flame, Gauge, ShieldAlert, SignalHigh } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchAlerts, fetchAnalytics, fetchCameraStatus, fetchEvents, fetchProcessingStatus, uploadVideo } from './services/api';
import { connectLiveFeed } from './services/socket';
import { StatCard } from './components/StatCard';
import { AlertsPanel } from './components/AlertsPanel';
import { EventTimeline } from './components/EventTimeline';
import { CameraMonitor } from './components/CameraMonitor';
import { HeatmapPanel } from './components/HeatmapPanel';
import { UploadPanel } from './components/UploadPanel';
import { DemoFramePanel } from './components/DemoFramePanel';
import type { AlertItem, AnalyticsResponse, CameraStatusItem, EventItem, JobStatusItem } from './types/api';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000';

type ToastItem = {
  id: string;
  title: string;
  message: string;
  tone: 'success' | 'info' | 'warning' | 'danger';
};

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
    <div className="min-h-screen bg-ink text-slate-100">
      <div className="absolute inset-0 bg-grid bg-[size:28px_28px] opacity-20 pointer-events-none" />
      <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-3">
        {toasts.map((toast) => (
          <div key={toast.id} className={`pointer-events-auto animate-pop-in rounded-2xl border px-4 py-3 shadow-glow backdrop-blur ${toast.tone === 'success' ? 'border-emerald-400/30 bg-emerald-400/10' : toast.tone === 'warning' ? 'border-amber-400/30 bg-amber-400/10' : toast.tone === 'danger' ? 'border-rose-400/30 bg-rose-400/10' : 'border-sky-400/30 bg-sky-400/10'}`}>
            <p className="text-sm font-semibold text-slate-100">{toast.title}</p>
            <p className="text-sm text-slate-300">{toast.message}</p>
          </div>
        ))}
      </div>
      <main className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 p-4 md:p-8">
        <header className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(14,22,40,0.96),rgba(17,26,46,0.76))] p-6 shadow-glow backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300/80">Store Intelligence System</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">Real-time store analytics and alerting</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Track people, detect operational anomalies, and monitor store cameras from one live dashboard.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <button className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-left text-sm font-medium text-cyan-200">
                Live demo ready
              </button>
              <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-slate-200">
                Connect webcam
              </button>
              <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-slate-200">
                View alerts
              </button>
              <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-slate-200">
                Export report
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <UploadPanel
            fileName={selectedFile?.name ?? null}
            status={uploadStatus}
            progress={uploadProgress}
            message={uploadMessage}
            loading={isLoading}
            onPickFile={setSelectedFile}
            onUpload={handleUpload}
          />

          <div className="rounded-3xl border border-white/10 bg-panel/90 p-5 shadow-glow">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Processing Overview</h2>
                <p className="text-sm text-slate-400">Dwell time, zone analytics, and live ingestion state</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${isRefreshing ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'}`}>
                {isRefreshing ? 'Refreshing' : 'Live'}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-sm text-slate-400">Dwell Time</p>
                <p className="mt-2 text-2xl font-semibold text-cyan-200">{(analytics?.dwell_time ?? 0).toFixed(1)}s</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-sm text-slate-400">Main Zone</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-200">{analytics?.zone_counts?.main ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-sm text-slate-400">Restricted Zone</p>
                <p className="mt-2 text-2xl font-semibold text-rose-200">{analytics?.zone_counts?.restricted ?? 0}</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
              The backend streams job_status updates while the video is being processed, then refreshes analytics and event history when complete.
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                { label: 'Upload', value: uploadStatus },
                { label: 'Inference', value: analytics ? 'ready' : 'loading' },
                { label: 'WebSocket', value: 'connected' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/30 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="People Count" value={analytics?.people_count ?? 0} icon={Gauge} accent="text-cyan-300" description="Live tracked people" />
          <StatCard title="Active Alerts" value={alerts.length} icon={ShieldAlert} accent="text-rose-300" description="Streaming notifications" />
          <StatCard title="Density" value={`${Math.round((analytics?.density ?? 0) * 100)}%`} icon={Flame} accent="text-amber-300" description="Customer density signal" />
          <StatCard title="Camera Status" value={cameras.filter((camera) => camera.live).length} icon={Camera} accent="text-emerald-300" description="Online feeds" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-white/10 bg-panel/90 p-5 shadow-glow">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Analytics Trend</h2>
                <p className="text-sm text-slate-400">Event mix and people flow</p>
              </div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-400">
                <SignalHigh className="h-4 w-4 text-cyan-300" /> Live
              </div>
            </div>
            <TrendChart data={trendData} loading={isLoading} />
          </div>

          <AlertsPanel alerts={alerts} loading={isLoading} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-panel/90 p-5 shadow-glow">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Event History</h2>
                <p className="text-sm text-slate-400">Detected store intelligence events</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-500" />
            </div>
            <EventTimeline events={events} loading={isLoading} />
          </div>

          <div className="space-y-4">
            <CameraMonitor cameras={cameras} loading={isLoading} />
            <HeatmapPanel peopleCount={analytics?.people_count ?? 0} density={analytics?.density ?? 0} />
            <DemoFramePanel apiBase={API_BASE} />
          </div>
        </section>
      </main>
    </div>
  );
}

function TrendChart({ data, loading }: { data: AnalyticsResponse['trends']; loading: boolean }) {
  if (loading) {
    return <div className="flex h-72 animate-pulse items-center justify-center rounded-2xl border border-white/5 bg-slate-950/40 text-sm text-slate-500">Loading analytics chart...</div>;
  }

  if (!data.length) {
    return <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/40 text-sm text-slate-500">No trend data yet.</div>;
  }

  return (
    <div className="h-72 rounded-2xl border border-white/5 bg-slate-950/40 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} />
          <YAxis stroke="#64748b" tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 16 }} />
          <Area dataKey="value" stroke="#38bdf8" fill="url(#trendFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default App;