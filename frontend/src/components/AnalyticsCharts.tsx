import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function AnalyticsCharts({ analytics }: { analytics: any }) {
  const trends = analytics?.trends ?? [];
  const density = (analytics?.density ?? 0) * 100;
  const activity = analytics?.camera_activity ?? [];
  const distribution = (analytics?.trends ?? []).slice(0, 4).map((t: any, i: number) => ({ name: t.label, value: t.value }));

  return (
    <div className="rounded-2xl border border-white/10 bg-panel/90 p-4">
      <h3 className="text-lg font-semibold">Analytics</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="h-44 rounded-xl bg-slate-950/40 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity={0.6}/><stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/></linearGradient>
              </defs>
              <XAxis dataKey="label" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Area dataKey="value" stroke="#38bdf8" fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="h-44 rounded-xl bg-slate-950/40 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trends}>
              <XAxis dataKey="label" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="value" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="h-44 rounded-xl bg-slate-950/40 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends}>
              <XAxis dataKey="label" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Line dataKey="value" stroke="#34d399" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="h-44 rounded-xl bg-slate-950/40 p-2 flex items-center justify-center">
          <ResponsiveContainer width="80%" height="80%">
            <PieChart>
              <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={30} outerRadius={50}>
                {distribution.map((d: any, i: number) => (
                  <Cell key={i} fill={["#06b6d4", "#38bdf8", "#60a5fa", "#f97316"][i % 4]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
