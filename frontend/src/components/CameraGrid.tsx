import { motion } from 'framer-motion';
import type { CameraItem } from '../mock/dashboardData';

export default function CameraGrid({ cameras }: { cameras: CameraItem[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-panel/90 p-4">
      <h3 className="text-lg font-semibold">Live Camera Grid</h3>
      <div className="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {cameras.map((c) => (
          <motion.div key={c.id} whileHover={{ scale: 1.02 }} className="relative overflow-hidden rounded-xl border border-white/6 bg-black/40 p-2">
            <div className={`h-40 w-full rounded-md bg-gradient-to-br from-black/40 to-white/2 flex items-center justify-center text-slate-300 relative overflow-hidden`}> 
              <img
                src={c.stream}
                alt={c.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  // hide broken image so the gradient placeholder is visible
                  const img = e.currentTarget as HTMLImageElement;
                  img.style.display = 'none';
                  img.removeAttribute('src');
                }}
              />
              <div className="absolute left-3 top-3 rounded-md bg-black/40 px-2 py-1 text-xs text-slate-200">{c.name}</div>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-200">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-slate-400">FPS: {c.fps} • People: {c.people}</div>
              </div>
              <div className={`rounded-full px-2 py-1 text-xs ${c.live ? 'bg-emerald-400/10 border border-emerald-300' : 'bg-rose-400/10 border border-rose-300'}`}>{c.processing}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
