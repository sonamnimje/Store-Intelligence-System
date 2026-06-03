import type { EventItem } from '../types/api';

type EventTimelineProps = {
  events: EventItem[];
  loading?: boolean;
};

type GroupedEvent = {
  key: string;
  event_type: string;
  severity: string;
  camera_id: number;
  timestamp: string;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  event_ids: string[];
  occurrence_count: number;
  track_ids: number[];
  metadata: Record<string, unknown>;
  is_active: boolean;
  confidence: number;
  duration_seconds: number;
  status: string;
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
  const groupedEvents = events.reduce<Map<string, GroupedEvent>>((groups, event) => {
    const metadata = event.metadata ?? {};
    const trackIds = Array.isArray(event.track_ids) && event.track_ids.length ? event.track_ids : Array.isArray(metadata.track_ids) ? metadata.track_ids.map(Number).filter(Number.isFinite) : event.track_id ? [event.track_id] : [];
    const trackKey = event.track_key ?? (trackIds.length ? trackIds.map(String).sort().join('|') : 'camera');
    const groupKey = event.event_key ?? `${event.camera_id}:${event.event_type}:${trackKey}`;
    const current = groups.get(groupKey);
    const timestamp = event.last_seen_at ?? event.timestamp;
    const firstSeen = event.first_seen_at ?? event.timestamp;
    const occurrenceCount = event.occurrence_count ?? 1;
    const metadataConfidence = typeof metadata.confidence === 'number' ? metadata.confidence : Number(metadata.confidence ?? 0);
    const confidence = event.confidence ?? (Number.isFinite(metadataConfidence) ? metadataConfidence : 0);
    const durationSecondsValue = event.duration_seconds ?? (event.first_seen_at && event.last_seen_at ? Math.max(0, Math.round((new Date(event.last_seen_at).getTime() - new Date(event.first_seen_at).getTime()) / 1000)) : 0);
    const status = event.status ?? (event.is_active ? 'active' : 'closed');

    if (current) {
      current.occurrence_count += occurrenceCount;
      current.event_ids.push(event.event_id);
      current.first_seen_at = current.first_seen_at && new Date(current.first_seen_at).getTime() <= new Date(firstSeen).getTime() ? current.first_seen_at : firstSeen;
      current.last_seen_at = current.last_seen_at && new Date(current.last_seen_at).getTime() >= new Date(timestamp).getTime() ? current.last_seen_at : timestamp;
      current.timestamp = current.last_seen_at ?? timestamp;
      current.track_ids = Array.from(new Set([...current.track_ids, ...trackIds])).sort((left, right) => left - right);
      current.is_active = current.is_active || Boolean(event.is_active);
      current.confidence = Math.max(current.confidence, confidence);
      current.duration_seconds = Math.max(current.duration_seconds, durationSecondsValue);
      current.status = current.is_active ? 'active' : status;
      current.metadata = { ...current.metadata, ...metadata };
      return groups;
    }

    groups.set(groupKey, {
      key: groupKey,
      event_type: event.event_type,
      severity: event.severity,
      camera_id: event.camera_id,
      timestamp,
      first_seen_at: firstSeen,
      last_seen_at: event.last_seen_at ?? event.timestamp,
      event_ids: [event.event_id],
        occurrence_count: occurrenceCount,
      track_ids: trackIds,
      metadata,
      is_active: Boolean(event.is_active),
        confidence,
        duration_seconds: durationSecondsValue,
        status,
    });

    return groups;
  }, new Map());

  const orderedEvents = [...groupedEvents.values()].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());

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
            const trackIds = event.track_ids.length ? event.track_ids.join(', ') : null;
            const durationSeconds = `${Math.max(0, Math.round(event.duration_seconds))}s`;
            const lifecycleState = event.status;
            const normalizedEventType = event.event_type.split('_').join(' ');
            const title = event.event_type === 'suspicious_lingering' ? `Lingering detected for ${durationSeconds}` : event.event_type === 'crowd_density' ? `Crowd density detected ${event.occurrence_count > 1 ? `(${event.occurrence_count} updates)` : ''}`.trim() : `${normalizedEventType} detected`;

            return (
              <div key={event.key} className="animate-pop-in rounded-2xl border border-white/10 bg-slate-950/40 p-4 transition hover:border-cyan-400/30">
                <div className="grid gap-2 md:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Timestamp</p>
                    <p className="mt-1 text-sm text-slate-100">{new Date(event.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Event Type</p>
                    <p className="mt-1 text-sm text-slate-100">{title}</p>
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
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 uppercase tracking-[0.18em]">{lifecycleState}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Confidence {event.confidence?.toFixed(2) ?? '0.00'}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{event.occurrence_count} updates</span>
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