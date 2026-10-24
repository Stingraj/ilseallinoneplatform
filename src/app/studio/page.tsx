import Link from 'next/link';
import { ArrowRight, Building2, Eye, Images, Inbox, Mail, Plus, Receipt, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/studio/empty-state';
import { MetricCard } from '@/components/studio/metric-card';
import { PageHeader } from '@/components/studio/page-header';
import { SetupNotice } from '@/components/studio/setup-notice';
import { formatCurrency } from '@/lib/catalog';
import { MIGRATION_HINT, isMissingSchema, requireOwnerPage } from '@/lib/studio/data';

export const dynamic = 'force-dynamic';

const RANGES = { '30': 30, '90': 90, '365': 365 } as const;
type Range = keyof typeof RANGES;

function sinceIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range: rawRange } = await searchParams;
  const range: Range = rawRange && rawRange in RANGES ? (rawRange as Range) : '30';
  const since = sinceIso(RANGES[range]);
  const supabase = await requireOwnerPage();
  const today = new Date().toISOString().slice(0, 10);

  const [artworks, sales, enquiries, campaigns, views, exhibitions] = await Promise.all([
    supabase.from('artworks').select('id, title, status, image_url, created_at, updated_at').order('updated_at', { ascending: false }),
    supabase.from('sales').select('id, sale_price, discount, commission_percentage, sale_date').gte('sale_date', since.slice(0, 10)),
    supabase.from('enquiries').select('id, name, message, status, created_at, artwork_id').gte('created_at', since).order('created_at', { ascending: false }),
    supabase.from('email_campaign_log').select('id, recipient_count, dispatch_mode, succeeded, created_at').gte('created_at', since),
    supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event', 'artwork_view').gte('created_at', since),
    supabase.from('exhibitions').select('id, title, venue, start_date, end_date').gte('end_date', today).order('start_date').limit(4),
  ]);

  const allArtworks = artworks.data ?? [];
  const available = allArtworks.filter((a) => a.status === 'Available').length;
  const sold = allArtworks.filter((a) => a.status === 'Sold').length;
  const salesRows = sales.data ?? [];
  const salesTotal = salesRows.reduce((sum, sale) => {
    const price = Number(sale.sale_price ?? 0);
    const discounted = price * (1 - Number(sale.discount ?? 0) / 100);
    return sum + discounted * (1 - Number(sale.commission_percentage ?? 0) / 100);
  }, 0);
  const liveCampaigns = (campaigns.data ?? []).filter((c) => c.dispatch_mode === 'live' && c.succeeded);
  const studioSchemaMissing = [enquiries.error, campaigns.error, views.error].some((error) => isMissingSchema(error));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Good to see you"
        description="Your studio at a glance. Every number comes from the archive, sales, enquiries and website records. Nothing is estimated."
        actions={
          <nav aria-label="Time range" className="flex rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200">
            {(Object.keys(RANGES) as Range[]).map((key) => (
              <Link
                key={key}
                href={`/studio?range=${key}`}
                aria-current={range === key ? 'true' : undefined}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${range === key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {key === '365' ? '12 months' : `${key} days`}
              </Link>
            ))}
          </nav>
        }
      />

      {studioSchemaMissing && <SetupNotice title="Some metrics are not connected yet">{MIGRATION_HINT}</SetupNotice>}

      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Artworks in the archive" value={String(allArtworks.length)} hint={`${available} available · ${sold} sold`} icon={Images} accent="#5B8DEF" />
        <MetricCard
          label="Sales (net of discount & commission)"
          value={salesRows.length ? formatCurrency(salesTotal, 'USD') : '—'}
          hint={`${salesRows.length} recorded in this period`}
          icon={Receipt}
          accent="#7FD8B0"
        />
        <MetricCard
          label="Enquiries"
          value={enquiries.error ? '—' : String(enquiries.data?.length ?? 0)}
          hint={enquiries.error ? 'Not connected yet' : `${(enquiries.data ?? []).filter((e) => e.status === 'new').length} waiting for a reply`}
          icon={Inbox}
          accent="#F36C65"
        />
        <MetricCard
          label="Artwork page views"
          value={views.error ? '—' : String(views.count ?? 0)}
          hint={views.error ? 'Not connected yet' : 'Anonymous page views, not unique visitors'}
          icon={Eye}
          accent="#B9A2FF"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="studio-card p-6 xl:col-span-2" aria-labelledby="recent-artworks">
          <div className="mb-5 flex items-center justify-between">
            <h2 id="recent-artworks" className="font-studio text-lg font-semibold">Recently updated artworks</h2>
            <Link href="/studio/archive" className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
              Archive <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          {allArtworks.length === 0 ? (
            <EmptyState icon={Images} title="No artworks yet" action={<Button asChild><Link href="/studio/archive/new">Add your first artwork</Link></Button>} />
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {allArtworks.slice(0, 6).map((artwork) => (
                <li key={artwork.id}>
                  <Link href={`/studio/archive/${artwork.id}`} className="group block">
                    <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                      {artwork.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={artwork.image_url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                      )}
                    </div>
                    <p className="mt-2 truncate text-sm font-medium text-slate-800">{artwork.title}</p>
                    <p className="text-xs text-slate-400">{artwork.status}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="studio-card p-6" aria-labelledby="quick-actions">
          <h2 id="quick-actions" className="mb-4 font-studio text-lg font-semibold">Quick actions</h2>
          <ul className="space-y-2">
            {[
              { href: '/studio/archive/new', label: 'Add an artwork', icon: Plus, accent: '#5B8DEF' },
              { href: '/studio/website', label: 'Choose featured works', icon: Sparkles, accent: '#F36C65' },
              { href: '/studio/email', label: 'Write a campaign', icon: Mail, accent: '#F6CE61' },
              { href: '/studio/viewing-rooms', label: 'Open a viewing room', icon: Building2, accent: '#FFB38A' },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="flex items-center gap-3 rounded-xl p-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: item.accent }}>
                    <item.icon className="h-4 w-4" aria-hidden />
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="studio-card p-6 xl:col-span-2" aria-labelledby="recent-enquiries">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="recent-enquiries" className="font-studio text-lg font-semibold">Latest enquiries</h2>
            <Link href="/studio/enquiries" className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
              All enquiries <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          {enquiries.error || (enquiries.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">{enquiries.error ? 'Enquiries will appear here once the Studio migration is applied.' : 'No enquiries in this period.'}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {(enquiries.data ?? []).slice(0, 5).map((enquiry) => (
                <li key={enquiry.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{enquiry.name}</p>
                    <p className="truncate text-sm text-slate-500">{enquiry.message}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{enquiry.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="studio-card p-6" aria-labelledby="upcoming">
          <h2 id="upcoming" className="mb-4 font-studio text-lg font-semibold">Upcoming exhibitions</h2>
          {(exhibitions.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">Nothing scheduled. <Link href="/studio/exhibitions" className="font-medium text-slate-900 underline">Plan one</Link></p>
          ) : (
            <ul className="space-y-3">
              {(exhibitions.data ?? []).map((exhibition) => (
                <li key={exhibition.id} className="rounded-xl bg-[#FFF3EB] p-3">
                  <p className="text-sm font-semibold text-slate-800">{exhibition.title}</p>
                  <p className="text-xs text-slate-500">{[exhibition.venue, exhibition.start_date].filter(Boolean).join(' · ')}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-xs text-slate-400">
            Campaigns sent in this period: {campaigns.error ? '—' : `${liveCampaigns.length} (${liveCampaigns.reduce((n, c) => n + c.recipient_count, 0)} recipients)`}
          </p>
        </section>
      </div>
    </div>
  );
}
