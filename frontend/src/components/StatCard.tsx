import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  title: string;
  value: string | number;
  description: string;
  accent: string;
  icon: LucideIcon;
};

export function StatCard({ title, value, description, accent, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-panel/90 p-5 shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className={`mt-3 text-3xl font-semibold ${accent}`}>{value}</p>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <Icon className={`h-5 w-5 ${accent}`} />
        </div>
      </div>
    </div>
  );
}