import React from 'react';

export default function DashboardPanel({
  title,
  description,
  badge,
  children,
}: {
  title?: string;
  description?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-panel/90 p-5 shadow-glow">
      {(title || description || badge) && (
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && <p className="text-sm text-slate-400">{description}</p>}
          </div>
          {badge && <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">{badge}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
