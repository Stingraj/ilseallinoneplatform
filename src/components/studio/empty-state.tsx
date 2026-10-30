import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="studio-card flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3ece6] text-[color:var(--studio-accent)]">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold text-[color:var(--studio-ink)]">{title}</h2>
      {children && <div className="mt-1 max-w-md text-sm text-[color:var(--studio-muted)]">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
