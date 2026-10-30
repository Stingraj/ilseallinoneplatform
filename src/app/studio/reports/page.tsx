import Link from 'next/link';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/studio/page-header';
import { SetupNotice } from '@/components/studio/setup-notice';
import { requireOwnerPage } from '@/lib/studio/data';
import { REPORT_TABS, loadReport, parseRange, type ReportTab } from '@/lib/studio/reports';

export const dynamic = 'force-dynamic';

const TAB_LABEL: Record<ReportTab, string> = { artworks: 'Artworks', enquiries: 'Enquiries', campaigns: 'Campaigns', exhibitions: 'Exhibitions', sales: 'Sales' };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const tab: ReportTab = (REPORT_TABS as readonly string[]).includes(params.tab ?? '') ? (params.tab as ReportTab) : 'artworks';
  const range = parseRange(params.from, params.to);
  const supabase = await requireOwnerPage();
  const report = await loadReport(supabase, tab, range);
  const query = (next: Partial<{ tab: string }>) => new URLSearchParams({ tab, from: range.from, to: range.to, ...next }).toString();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Figures come straight from the studio records for the chosen dates."
        actions={
          report.rows ? (
            <a href={`/studio/reports/export?${query({})}`} className="studio-btn-secondary"><Download className="mr-1.5 h-4 w-4" aria-hidden />Export CSV</a>
          ) : null
        }
      />

      <nav aria-label="Report" className="studio-tabs">
        {REPORT_TABS.map((t) => (
          <Link key={t} href={`/studio/reports?${query({ tab: t })}`} aria-current={t === tab ? 'page' : undefined} className="studio-tab">{TAB_LABEL[t]}</Link>
        ))}
      </nav>

      <form className="studio-card flex flex-wrap items-end gap-3 p-4" action="/studio/reports">
        <input type="hidden" name="tab" value={tab} />
        <label className="text-sm"><span className="studio-label mb-1 block">From</span><input type="date" name="from" defaultValue={range.from} className="h-10 rounded-xl border border-[color:var(--studio-line)] bg-white px-3" /></label>
        <label className="text-sm"><span className="studio-label mb-1 block">To</span><input type="date" name="to" defaultValue={range.to} className="h-10 rounded-xl border border-[color:var(--studio-line)] bg-white px-3" /></label>
        <button type="submit" className="studio-btn-secondary">Apply</button>
      </form>

      {!report.rows ? (
        <SetupNotice title={`${TAB_LABEL[tab]}: unavailable`}>{report.error}</SetupNotice>
      ) : (
        <>
          <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {report.summary.map((s) => (
              <div key={s.label} className="studio-card p-4">
                <p className="studio-label">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
              </div>
            ))}
          </section>
          {report.rows.length === 0 ? (
            <p className="studio-card p-5 text-sm text-[color:var(--studio-muted)]">No records between {range.from} and {range.to}.</p>
          ) : (
            <div className="studio-table-wrap">
              <table className="studio-table">
                <caption className="sr-only">{TAB_LABEL[tab]} from {range.from} to {range.to}</caption>
                <thead><tr>{report.header.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
                <tbody>
                  {report.rows.slice(0, 200).map((row, i) => (
                    <tr key={i}>{row.map((cell, j) => <td key={j}>{cell === null || cell === undefined || cell === '' ? '—' : String(cell)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
              {report.rows.length > 200 && <p className="p-3 text-xs text-[color:var(--studio-muted)]">Showing 200 of {report.rows.length}. The CSV export contains all of them.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
