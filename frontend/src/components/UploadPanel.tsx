import { Upload } from 'lucide-react';

type UploadPanelProps = {
  fileName: string | null;
  status: string;
  progress: number;
  message: string;
  loading?: boolean;
  onPickFile: (file: File | null) => void;
  onUpload: () => void;
};

export function UploadPanel({ fileName, status, progress, message, loading, onPickFile, onUpload }: UploadPanelProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-panel/90 p-5 shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Video Upload</h2>
          <p className="text-sm text-slate-400">Upload CCTV footage and start analysis automatically</p>
        </div>
        <Upload className="h-5 w-5 text-cyan-300" />
      </div>
      <div className="mt-4 space-y-4">
        <label className="block cursor-pointer rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
          <span className="font-medium text-slate-100">Choose video file</span>
          <input
            className="mt-3 block w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-400/15 file:px-4 file:py-2 file:text-cyan-200 hover:file:bg-cyan-400/20"
            type="file"
            accept="video/*"
            onChange={(event) => onPickFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onUpload}
            disabled={!fileName || status === 'processing' || loading}
          >
            {loading ? 'Preparing...' : 'Start Processing'}
          </button>
          <span className="text-sm text-slate-400">{fileName ?? 'No file selected'}</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Status</span>
            <span className={`uppercase tracking-[0.2em] ${status === 'completed' ? 'text-emerald-200' : status === 'failed' || status === 'error' ? 'text-rose-200' : status === 'processing' ? 'text-cyan-200' : 'text-slate-200'}`}>{status}</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/5">
            <div className="h-2 rounded-full bg-cyan-400 transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
          <p className="mt-3 text-sm text-slate-400">{message}</p>
        </div>
      </div>
    </div>
  );
}