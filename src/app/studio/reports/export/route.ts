import { NextResponse, type NextRequest } from 'next/server';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { toCsv } from '@/lib/studio/csv';
import { REPORT_TABS, loadReport, parseRange, type ReportTab } from '@/lib/studio/reports';

export async function GET(request: NextRequest) {
  const { client, error } = await getOwnerClient();
  if (!client) return NextResponse.json({ error }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const tab = (REPORT_TABS as readonly string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as ReportTab) : 'artworks';
  const range = parseRange(params.get('from') ?? undefined, params.get('to') ?? undefined);
  const report = await loadReport(client, tab, range);
  if (!report.rows) return NextResponse.json({ error: report.error }, { status: 503 });

  return new NextResponse(toCsv(report.header, report.rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ilse-${tab}-${range.from}-to-${range.to}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
