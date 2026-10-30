import Link from 'next/link';
import { ArrowRight, Building2, FileText, Images, Inbox, Mail, Plus, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/studio/metric-card';
import { PageHeader } from '@/components/studio/page-header';
import { SetupNotice } from '@/components/studio/setup-notice';
import { exhibitionDates } from '@/lib/email/invitation';
import { MIGRATION_HINT, isMissingSchema, requireOwnerPage } from '@/lib/studio/data';
import { getStudioSettings } from '@/lib/studio/settings';

export const dynamic = 'force-dynamic';

/** Open enquiries = the statuses that still need the artist: "new" and "follow_up". */
const OPEN_ENQUIRY_STATUSES = ['new', 'follow_up'];

const CAMPAIGN_STATE: Record<string, string> = {
  dispatching: 'Sending to workflow',
  accepted_by_workflow: 'Accepted by workflow',
  failed: 'Failed',
  unknown: 'Unknown',
};

const count = (result: { count: number | null; error: unknown }) => (result.error ? '—' : String(result.count ?? 0));

export default async function OverviewPage() {
  const supabase = await requireOwnerPage();
  const settings = await getStudioSettings(supabase);
  const today = new Date().toISOString().slice(0, 10);

  const [total, available, collectors, openEnquiries, recent, enquiries, upcoming, operations] = await Promise.all([
    supabase.from('artworks').select('id', { count: 'exact', head: true }),
    supabase.from('artworks').select('id', { count: 'exact', head: true }).eq('status', 'Available'),
    supabase.from('contacts').select('id', { count: 'exact', head: true }),
    supabase.from('enquiries').select('id', { count: 'exact', head: true }).in('status', OPEN_ENQUIRY_STATUSES),
    supabase.from('artworks').select('id, title, status, year, image_url').order('updated_at', { ascending: false }).limit(6),
    supabase.from('enquiries').select('id, name, message, status, created_at, contact_id').in('status', OPEN_ENQUIRY_STATUSES).order('created_at', { ascending: false }).limit(5),
    supabase.from('exhibitions').select('id, title, venue, location, start_date, end_date').or(`end_date.gte.${today},end_date.is.null`).order('start_date', { ascending: true, nullsFirst: false }).limit(1),
    supabase.from('email_dispatch_operations').select('id, subject, state, eligible_count, created_at').order('created_at', { ascending: false }).limit(4),
  ]);

  const enquiriesMissing = isMissingSchema(openEnquiries.error);
  const nextShow = upcoming.data?.[0];
  const dateLine = new Intl.DateTimeFormat(settings.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: settings.timezone }).format(new Date());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Studio overview"
        description={dateLine}
        actions={
          <>
            <a href="/" target="_blank" rel="noreferrer" className="studio-btn-secondary">View portfolio</a>
            <Button asChild className="h-10 rounded-xl"><Link href="/studio/archive/new"><Plus className="mr-1 h-4 w-4" aria-hidden />Add artwork</Link></Button>
          </>
        }
      />

      {enquiriesMissing && <SetupNotice title="Enquiry figures are not connected yet">{MIGRATION_HINT}</SetupNotice>}

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Artworks" value={count(total)} icon={Images} href="/studio/archive" />
        <MetricCard label="Available" value={count(available)} icon={Images} href="/studio/archive" hint="Status “Available” in the archive" />
        <MetricCard label="Collectors" value={count(collectors)} icon={Users} href="/studio/collectors" />
        <MetricCard label="Open enquiries" value={count(openEnquiries)} icon={Inbox} href="/studio/enquiries?status=new" hint="New or follow-up" />
      </section>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <section className="studio-card p-5" aria-labelledby="ov-enquiries">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="ov-enquiries" className="text-base font-semibold">Latest enquiries</h2>
              <Link href="/studio/enquiries" className="flex items-center gap-1 text-sm text-[color:var(--studio-muted)] hover:text-[color:var(--studio-ink)]">All <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </div>
            {enquiries.error ? (
              <p className="text-sm text-[color:var(--studio-muted)]">{enquiriesMissing ? 'Not connected yet.' : 'Enquiries could not be loaded.'}</p>
            ) : (enquiries.data ?? []).length === 0 ? (
              <p className="text-sm text-[color:var(--studio-muted)]">No open enquiries.</p>
            ) : (
              <ul className="divide-y divide-[color:var(--studio-line)]">
                {(enquiries.data ?? []).map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{e.name}</p>
                      <p className="truncate text-sm text-[color:var(--studio-muted)]">{e.message}</p>
                    </div>
                    <span className={`studio-pill ${e.status === 'new' ? 'studio-pill-warning' : ''}`}>{e.status === 'follow_up' ? 'Follow up' : 'New'}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="studio-card p-5" aria-labelledby="ov-recent">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="ov-recent" className="text-base font-semibold">Recently updated artworks</h2>
              <Link href="/studio/archive" className="flex items-center gap-1 text-sm text-[color:var(--studio-muted)] hover:text-[color:var(--studio-ink)]">Archive <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </div>
            {recent.error ? (
              <p className="text-sm text-[color:var(--studio-muted)]">Artworks could not be loaded.</p>
            ) : (recent.data ?? []).length === 0 ? (
              <p className="text-sm text-[color:var(--studio-muted)]">No artworks yet. <Link href="/studio/archive/new" className="underline">Add the first one</Link>.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {(recent.data ?? []).map((a) => (
                  <li key={a.id}>
                    <Link href={`/studio/archive/${a.id}`} className="group block">
                      <div className="aspect-square overflow-hidden rounded-xl bg-[#efece8] p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {a.image_url && <img src={a.image_url} alt="" className="h-full w-full object-contain transition group-hover:scale-[1.02]" />}
                      </div>
                      <p className="mt-2 truncate text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-[color:var(--studio-muted)]">{[a.status, a.year].filter(Boolean).join(' · ')}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-5 xl:col-span-4">
          <section className="studio-card-dark p-5" aria-labelledby="ov-upcoming">
            <h2 id="ov-upcoming" className="text-base font-semibold">Upcoming exhibition</h2>
            {upcoming.error ? (
              <p className="mt-3 text-sm text-white/70">Exhibitions could not be loaded.</p>
            ) : nextShow ? (
              <Link href={`/studio/exhibitions/${nextShow.id}`} className="mt-4 block rounded-xl bg-white/5 p-4 hover:bg-white/10">
                <p className="text-lg font-medium">{nextShow.title}</p>
                <p className="mt-1 text-sm text-white/70">{[exhibitionDates(nextShow.start_date, nextShow.end_date), nextShow.venue].filter(Boolean).join(' · ') || 'No dates yet'}</p>
              </Link>
            ) : (
              <p className="mt-3 text-sm text-white/70">Nothing scheduled. <Link href="/studio/exhibitions/new" className="underline">Plan an exhibition</Link>.</p>
            )}
          </section>

          <section className="studio-card p-5" aria-labelledby="ov-campaigns">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="ov-campaigns" className="text-base font-semibold">Campaigns</h2>
              <Link href="/studio/email" className="text-sm text-[color:var(--studio-muted)] hover:text-[color:var(--studio-ink)]">Email Studio</Link>
            </div>
            {isMissingSchema(operations.error) ? (
              <p className="text-sm text-[color:var(--studio-muted)]">Campaign history is not set up yet.</p>
            ) : operations.error ? (
              <p className="text-sm text-[color:var(--studio-muted)]">Campaigns could not be loaded.</p>
            ) : (operations.data ?? []).length === 0 ? (
              <p className="text-sm text-[color:var(--studio-muted)]">No campaigns sent yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {(operations.data ?? []).map((op) => (
                  <li key={op.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{op.subject}</span>
                    <span className={`studio-pill ${op.state === 'accepted_by_workflow' ? 'studio-pill-success' : op.state === 'failed' ? 'studio-pill-danger' : 'studio-pill-warning'}`}>{CAMPAIGN_STATE[op.state] ?? op.state}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="studio-card p-5" aria-labelledby="ov-actions">
            <h2 id="ov-actions" className="mb-2 text-base font-semibold">Quick actions</h2>
            <ul className="space-y-0.5 text-sm">
              {[
                { href: '/studio/archive/new', label: 'Add an artwork', icon: Plus },
                { href: '/studio/email', label: 'Write a campaign', icon: Mail },
                { href: '/studio/collectors', label: 'Add a collector', icon: UserPlus },
                { href: '/studio/exhibitions/new', label: 'Create an exhibition', icon: Building2 },
                { href: '/studio/archive/catalog', label: 'Generate a catalogue', icon: FileText },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="flex min-h-11 items-center gap-3 rounded-xl px-2 hover:bg-white">
                    <item.icon className="h-4 w-4 text-[color:var(--studio-accent)]" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
