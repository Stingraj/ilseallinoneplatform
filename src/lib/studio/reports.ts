import 'server-only';

import type { OwnerClient } from './data';
import { isMissingSchema } from './data';

export const REPORT_TABS = ['artworks', 'enquiries', 'campaigns', 'exhibitions', 'sales'] as const;
export type ReportTab = (typeof REPORT_TABS)[number];

export interface ReportRange {
  from: string;
  to: string;
}

/** Default range: the last 90 days, inclusive. Invalid input falls back to it. */
export function parseRange(from?: string, to?: string): ReportRange {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 89);
  const range = {
    from: from && iso.test(from) ? from : start.toISOString().slice(0, 10),
    to: to && iso.test(to) ? to : today.toISOString().slice(0, 10),
  };
  return range.from > range.to ? { from: range.to, to: range.from } : range;
}

const endOfDay = (date: string) => `${date}T23:59:59.999Z`;

export interface ReportTable {
  /** null = the source is not connected (missing table), shown as "Unavailable", never as zero. */
  rows: unknown[][] | null;
  header: string[];
  summary: { label: string; value: string }[];
  error: string | null;
}

const unavailable = (header: string[], error: { code?: string; message?: string }): ReportTable => ({
  rows: null,
  header,
  summary: [],
  error: isMissingSchema(error) ? 'Not connected yet: the database update for this report has not been applied.' : 'This report could not be loaded.',
});

export async function loadReport(client: OwnerClient, tab: ReportTab, range: ReportRange): Promise<ReportTable> {
  const lower = range.from;
  const upper = endOfDay(range.to);

  if (tab === 'artworks') {
    const header = ['Title', 'Status', 'Year', 'Medium', 'Added'];
    const { data, error } = await client.from('artworks').select('title, status, year, medium, created_at').gte('created_at', lower).lte('created_at', upper).order('created_at', { ascending: false }).limit(2000);
    if (error) return unavailable(header, error);
    const byStatus = new Map<string, number>();
    for (const a of data ?? []) byStatus.set(a.status ?? 'No status', (byStatus.get(a.status ?? 'No status') ?? 0) + 1);
    return {
      header,
      rows: (data ?? []).map((a) => [a.title, a.status, a.year, a.medium, a.created_at?.slice(0, 10)]),
      summary: [{ label: 'Added in range', value: String(data?.length ?? 0) }, ...[...byStatus].map(([label, n]) => ({ label, value: String(n) }))],
      error: null,
    };
  }

  if (tab === 'enquiries') {
    const header = ['Received', 'Name', 'Email', 'Status', 'Source page'];
    const { data, error } = await client.from('enquiries').select('created_at, name, email, status, source_page').gte('created_at', lower).lte('created_at', upper).order('created_at', { ascending: false }).limit(2000);
    if (error) return unavailable(header, error);
    const open = (data ?? []).filter((e) => e.status === 'new' || e.status === 'follow_up').length;
    return {
      header,
      rows: (data ?? []).map((e) => [e.created_at?.slice(0, 10), e.name, e.email, e.status, e.source_page]),
      summary: [{ label: 'Received', value: String(data?.length ?? 0) }, { label: 'Still open', value: String(open) }],
      error: null,
    };
  }

  if (tab === 'campaigns') {
    const header = ['Requested', 'Subject', 'Mode', 'Outcome', 'Eligible', 'Excluded'];
    const { data, error } = await client.from('email_dispatch_operations').select('created_at, subject, dispatch_mode, state, eligible_count, excluded_count').gte('created_at', lower).lte('created_at', upper).order('created_at', { ascending: false }).limit(2000);
    if (error) return unavailable(header, error);
    const accepted = (data ?? []).filter((o) => o.state === 'accepted_by_workflow');
    return {
      header,
      rows: (data ?? []).map((o) => [o.created_at?.slice(0, 10), o.subject, o.dispatch_mode, o.state, o.eligible_count, o.excluded_count]),
      summary: [
        { label: 'Campaigns', value: String(data?.length ?? 0) },
        { label: 'Accepted by workflow', value: String(accepted.length) },
        { label: 'Recipients handed to workflow', value: String(accepted.reduce((n, o) => n + (o.eligible_count ?? 0), 0)) },
      ],
      error: null,
    };
  }

  if (tab === 'exhibitions') {
    const header = ['Title', 'Venue', 'Opens', 'Closes', 'Published'];
    // Overlapping the range: starts before its end and ends after its start (open-ended counts).
    const { data, error } = await client.from('exhibitions').select('title, venue, start_date, end_date, is_published').lte('start_date', range.to).or(`end_date.gte.${range.from},end_date.is.null`).order('start_date', { ascending: false }).limit(500);
    if (error) return unavailable(header, error);
    return {
      header,
      rows: (data ?? []).map((x) => [x.title, x.venue, x.start_date, x.end_date, x.is_published ? 'Yes' : 'No']),
      summary: [{ label: 'Exhibitions in range', value: String(data?.length ?? 0) }],
      error: null,
    };
  }

  const header = ['Date', 'Artwork', 'Buyer', 'Status', 'Price', 'Currency'];
  const { data, error } = await client.from('sales').select('sale_date, sale_price, status, buyer_name, artworks(title, currency)').gte('sale_date', range.from).lte('sale_date', range.to).order('sale_date', { ascending: false }).limit(2000);
  if (error) return unavailable(header, error);
  const rows = (data ?? []).map((s) => {
    const art = (Array.isArray(s.artworks) ? s.artworks[0] : s.artworks) as { title?: string; currency?: string } | null;
    return [s.sale_date, art?.title ?? '', s.buyer_name ?? '', s.status ?? '', s.sale_price, art?.currency ?? 'Unknown'];
  });
  // Totals per currency; prices are never added across currencies.
  const totals = new Map<string, number>();
  for (const r of rows) if (typeof r[4] === 'number') totals.set(String(r[5]), (totals.get(String(r[5])) ?? 0) + (r[4] as number));
  return {
    header,
    rows,
    summary: [
      { label: 'Sales records', value: String(rows.length) },
      ...[...totals].map(([currency, total]) => ({ label: `Total (${currency})`, value: total.toLocaleString('en-GB', { maximumFractionDigits: 2 }) })),
    ],
    error: null,
  };
}
