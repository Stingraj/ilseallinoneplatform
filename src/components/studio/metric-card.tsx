import type { LucideIcon } from 'lucide-react';

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <div className="studio-card relative overflow-hidden p-5">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-25" style={{ backgroundColor: accent }} aria-hidden />
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-900" style={{ backgroundColor: accent }}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <p className="relative mt-4 font-studio text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="relative mt-1 text-sm font-medium text-slate-600">{label}</p>
      {hint && <p className="relative mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
