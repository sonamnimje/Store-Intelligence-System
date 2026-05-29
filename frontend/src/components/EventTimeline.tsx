import type { EventItem } from '../types/api';

type EventTimelineProps = {
  events: EventItem[];
  loading?: boolean;
};

function exportJson(events: any[]) {
  const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'events.json';
  link.click();
  URL.revokeObjectURL(url);
}

function exportCsv(events: any[]) {
  const header = ['timestamp', 'event_type', 'severity', 'camera_id'];
  const rows = events.map((event) => [event.timestamp, event.event_type, event.severity, event.camera_id].join(','));
  const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'events.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function EventTimeline({ events, loading }: EventTimelineProps) {
  const orderedEvents = [...events].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());

  return (
    <div className="rounded-3xl border border-white/10 bg-panel/90 p-5 shadow-glow">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Event Timeline</h2>
          <p className="text-sm text-slate-400">Newest-first detections and continuous incidents</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200" onClick={() => exportJson(orderedEvents)}>
            Export JSON
          </button>
          <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200" onClick={() => exportCsv(orderedEvents)}>
            Export CSV
          </button>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-2xl border border-white/10 bg-slate-950/40" />
            <div className="h-20 animate-pulse rounded-2xl border border-white/10 bg-slate-950/40" />
          </div>
        ) : orderedEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">No events available yet.</div>
        ) : (
          orderedEvents.map((event) => {
            const metadata = event.metadata ?? {};
            const trackIds = Array.isArray(metadata.track_ids) ? metadata.track_ids.map(String).join(', ') : metadata.track_id ? String(metadata.track_id) : null;
            const durationSeconds = typeof metadata.duration_seconds === 'number' ? `${metadata.duration_seconds.toFixed(1)}s` : null;
            const lifecycleState = typeof metadata.lifecycle_state === 'string' ? metadata.lifecycle_state : null;

            return (
              <div key={event.event_id} className="animate-pop-in rounded-2xl border border-white/10 bg-slate-950/40 p-4 transition hover:border-cyan-400/30">
                <div className="grid gap-2 md:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Timestamp</p>
                    <p className="mt-1 text-sm text-slate-100">{new Date(event.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Event Type</p>
                    <p className="mt-1 text-sm text-slate-100">{event.event_type}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Severity</p>
                    <p className="mt-1 text-sm text-slate-100">{event.severity}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Camera ID</p>
                    <p className="mt-1 text-sm text-slate-100">{event.camera_id}</p>
                  </div>
                </div>
                {(trackIds || durationSeconds || lifecycleState) && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                    {trackIds && <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1">Track {trackIds}</span>}
                    {durationSeconds && <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1">{durationSeconds} continuous</span>}
                    {lifecycleState && <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 uppercase tracking-[0.18em]">{lifecycleState}</span>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}