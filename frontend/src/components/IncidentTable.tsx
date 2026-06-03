import { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import type { AlertItem } from '../mock/dashboardData';

export function IncidentTable({ incidents }: { incidents: AlertItem[] }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => incidents.filter((i) => (i.message + i.type + i.cameraId).toLowerCase().includes(q.toLowerCase())), [incidents, q]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'incidents.json';
    a.click();
  }

  function exportCsv() {
    const header = ['id,type,severity,cameraId,message,timestamp,status'];
    const rows = list.map((l) => `${l.id},${l.type},${l.severity},${l.cameraId},"${l.message}",${l.timestamp},${l.status}`);
    const blob = new Blob([[...header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'incidents.csv';
    a.click();
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-panel/90 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Incident History</h3>
        <div className="flex items-center gap-2">
          <div className="relative flex items-center gap-2 rounded-md border border-white/5 bg-white/3 px-2 py-1">
            <Search className="h-4 w-4 text-slate-300" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search incidents" className="bg-transparent outline-none text-sm text-slate-200" />
          </div>
          <button onClick={exportCsv} className="rounded-md border border-white/5 bg-white/3 px-3 py-1 text-sm"><Download className="inline h-4 w-4 mr-1"/>CSV</button>
          <button onClick={exportJson} className="rounded-md border border-white/5 bg-white/3 px-3 py-1 text-sm"><Download className="inline h-4 w-4 mr-1"/>JSON</button>
        </div>
      </div>

      <div className="mt-3 overflow-auto">
        <table className="w-full table-auto text-sm">
          <thead>
            <tr className="text-xs text-slate-400">
              <th className="p-2 text-left">Incident</th>
              <th className="p-2 text-left">Camera</th>
              <th className="p-2">Severity</th>
              <th className="p-2">Status</th>
              <th className="p-2">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {list.map((it) => (
              <motion.tr key={it.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="odd:bg-white/2">
                <td className="p-2">{it.message} <div className="text-xs text-slate-400">{it.type}</div></td>
                <td className="p-2">{it.cameraId}</td>
                <td className="p-2">{it.severity}</td>
                <td className="p-2">{it.status}</td>
                <td className="p-2">{new Date(it.timestamp).toLocaleString()}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default IncidentTable;
