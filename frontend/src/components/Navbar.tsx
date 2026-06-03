import { Bell, Circle, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Navbar({ wsStatus = 'connected' }: { wsStatus?: 'connected' | 'disconnected' }) {
  return (
    <header className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-black/40 via-white/2 to-black/20 p-3 shadow-glow backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-cyan-400/10 flex items-center justify-center border border-cyan-400/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-cyan-300"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5"/></svg>
          </div>
          <div>
            <div className="text-sm font-semibold">Store Intelligence Dashboard</div>
            <div className="text-xs text-slate-400">Real-time CCTV analytics</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/2 px-3 py-1 text-xs">
          <span className={`h-2 w-2 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          <span className="text-slate-300">WS: {wsStatus}</span>
        </div>

        <div className="text-sm text-slate-300">{new Date().toLocaleString()}</div>

        <motion.button whileTap={{ scale: 0.95 }} className="relative p-2 rounded-md bg-white/3 border border-white/5">
          <Bell className="h-5 w-5 text-slate-100" />
          <span className="absolute -top-1 -right-1 inline-flex h-3 w-3 items-center justify-center rounded-full bg-rose-400 text-[10px] text-black">3</span>
        </motion.button>

        <div className="flex items-center gap-2">
          <div className="h-9 w-9 overflow-hidden rounded-full border border-white/5 bg-white/3 flex items-center justify-center">
            <User className="h-5 w-5 text-slate-100" />
          </div>
        </div>
      </div>
    </header>
  );
}
