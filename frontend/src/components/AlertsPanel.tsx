import type { AlertItem } from '../types/api';

export function AlertsPanel({ alerts, loading }: { alerts: AlertItem[]; loading?: boolean }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-panel/90 p-5 shadow-glow">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Active Alerts</h2>
          <p className="text-sm text-slate-400">Latest streaming notifications</p>
        </div>
      </div>
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-2xl border border-white/10 bg-slate-950/40" />
            <div className="h-20 animate-pulse rounded-2xl border border-white/10 bg-slate-950/40" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
            No active alerts. The store is operating within normal limits.
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.alert_id ?? alert.message} className="animate-pop-in rounded-2xl border border-white/10 bg-slate-950/40 p-4 transition hover:border-cyan-400/30">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-100">{alert.message}</p>
                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-xs uppercase tracking-[0.2em] text-amber-200">
                  {alert.severity ?? 'medium'}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">Camera {alert.camera_id ?? 1}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}