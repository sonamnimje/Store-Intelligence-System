export function HeatmapPanel({ peopleCount, density }: { peopleCount: number; density: number }) {
  const intensity = Math.max(0.1, Math.min(1, density + peopleCount * 0.02));

  return (
    <div className="rounded-3xl border border-white/10 bg-panel/90 p-5 shadow-glow">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Heatmap</h2>
        <p className="text-sm text-slate-400">Crowd intensity visualization</p>
      </div>
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/40 p-4">
        <div
          className="grid aspect-[4/3] grid-cols-6 grid-rows-4 gap-2 rounded-2xl bg-[#09111f] p-2"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(56,189,248,0.18), transparent 20%), radial-gradient(circle at 70% 60%, rgba(248,113,113,0.2), transparent 24%)' }}
        >
          {Array.from({ length: 24 }).map((_, index) => (
            <div
              key={index}
              className="rounded-lg border border-white/5"
              style={{ background: `rgba(56, 189, 248, ${Math.min(0.9, intensity * ((index % 5) + 1) * 0.08)})` }}
            />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <span>People: {peopleCount}</span>
          <span>Density: {Math.round(density * 100)}%</span>
        </div>
      </div>
    </div>
  );
}