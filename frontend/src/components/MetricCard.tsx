import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export default function MetricCard({ title, value, icon: Icon, accent = 'text-cyan-300' }: { title: string; value: string | number; icon: LucideIcon; accent?: string }) {
  return (
    <motion.div whileHover={{ scale: 1.03 }} className="rounded-2xl border border-white/6 bg-white/3 p-4 shadow-glow backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase">{title}</p>
          <p className={`mt-2 text-2xl font-semibold text-white`}>{value}</p>
        </div>
        <div className="rounded-full bg-white/5 p-3">
          <Icon className={`h-6 w-6 ${accent}`} />
        </div>
      </div>
    </motion.div>
  );
}
