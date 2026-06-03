import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import type { AlertItem } from '../mock/dashboardData';

function severityColor(s: AlertItem['severity']) {
  return s === 'critical' ? 'bg-rose-500/30 border-rose-400' : s === 'high' ? 'bg-rose-400/20 border-rose-300' : s === 'medium' ? 'bg-amber-400/10 border-amber-300' : 'bg-emerald-400/10 border-emerald-300';
}

export function AlertPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-panel/90 p-4">
      <h3 className="text-lg font-semibold">Live Alerts</h3>
      <div className="mt-3 space-y-2 max-h-80 overflow-auto">
        {alerts.map((a) => (
          <motion.div key={a.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={`flex items-center gap-3 rounded-md border ${severityColor(a.severity)} p-3`}>
            <div className="rounded-full bg-black/30 p-2">
              <AlertTriangle className="h-5 w-5 text-white/90" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="font-medium text-white">{a.message}</div>
                <div className="text-xs text-slate-300">Cam {a.cameraId}</div>
              </div>
              <div className="text-xs text-slate-400">{new Date(a.timestamp).toLocaleTimeString()} • {a.status}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default AlertPanel;
