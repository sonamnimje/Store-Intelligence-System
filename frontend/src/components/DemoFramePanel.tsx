export function DemoFramePanel({ apiBase }: { apiBase: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-panel/90 p-5 shadow-glow">
      <div className="mb-3">
        <h2 className="text-lg font-semibold">AI Pipeline Preview</h2>
        <p className="text-sm text-slate-400">Restricted zones, heat overlays, movement paths, and people count rendered on a demo frame</p>
      </div>
      <img src={`${apiBase}/demo-visualization`} alt="AI pipeline preview" className="h-56 w-full rounded-2xl border border-white/10 object-cover" />
    </div>
  );
}