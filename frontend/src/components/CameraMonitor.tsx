import type { CameraStatusItem } from '../types/api';

export function CameraMonitor({ cameras, loading }: { cameras: CameraStatusItem[]; loading?: boolean }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-panel/90 p-5 shadow-glow">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Camera Monitor</h2>
          <p className="text-sm text-slate-400">Operational feed status</p>
        </div>
      </div>
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            <div className="h-36 animate-pulse rounded-2xl border border-white/10 bg-slate-950/40" />
            <div className="h-36 animate-pulse rounded-2xl border border-white/10 bg-slate-950/40" />
          </div>
        ) : cameras.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
            No cameras are online yet. Connect a feed or upload a sample video to initialize monitoring.
          </div>
        ) : (
          cameras.map((camera) => (
            <div key={camera.camera_id} className="animate-pop-in rounded-2xl border border-white/10 bg-slate-950/40 p-4 transition hover:border-cyan-400/30">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-100">{camera.name}</p>
                  <p className="text-sm text-slate-400">{camera.stream_url}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs uppercase tracking-[0.2em] ${camera.live ? 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border border-rose-400/20 bg-rose-400/10 text-rose-200'}`}>
                  {camera.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-slate-500">Active people</p>
                  <p className="mt-1 text-lg font-semibold">{camera.active_people}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-slate-500">FPS</p>
                  <p className="mt-1 text-lg font-semibold">{camera.fps ?? 0}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-slate-500">Detection</p>
                  <p className="mt-1 text-lg font-semibold">{camera.detection_status ?? 'idle'}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-slate-500">Processing</p>
                  <p className="mt-1 text-lg font-semibold">{camera.processing_status ?? 'idle'}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}