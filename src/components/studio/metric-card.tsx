import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

/** One figure from real data. `href` links to the list the number counts; a dash means "not available". */
export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent?: string;
  href?: string;
}) {
  const body = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[color:var(--studio-accent)] ring-1 ring-[color:var(--studio-line)]">
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] text-[color:var(--studio-muted)]">{label}</span>
        <span className="block text-2xl font-semibold tabular-nums tracking-tight text-[color:var(--studio-ink)]">{value}</span>
        {hint && <span className="block truncate text-xs text-[color:var(--studio-muted)]">{hint}</span>}
      </span>
    </>
  );
  const className = 'studio-card flex items-center gap-3 p-4 transition-colors';
  return href ? (
    <Link href={href} className={`${className} hover:bg-white`}>{body}</Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
