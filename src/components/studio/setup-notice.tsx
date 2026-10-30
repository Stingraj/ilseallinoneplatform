import { AlertTriangle } from 'lucide-react';

/** Shown instead of fake data when a feature depends on a migration or setting that is not in place yet. */
export function SetupNotice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="status" className="flex gap-3 rounded-2xl border border-[#f1dfb8] bg-[#FFF3DC] p-4 text-sm text-[#865313]">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">{title}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}
