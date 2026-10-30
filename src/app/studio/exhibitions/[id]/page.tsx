import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/studio/page-header';
import { SetupNotice } from '@/components/studio/setup-notice';
import { exhibitionDates } from '@/lib/email/invitation';
import { MIGRATION_HINT, isMissingSchema, requireOwnerPage } from '@/lib/studio/data';
import { loadOrderedArtworks } from '@/lib/studio/exhibitions';
import { ExhibitionForm } from '../exhibition-form';
import { CatalogueAction, InvitationAction } from '../exhibition-actions';

export const dynamic = 'force-dynamic';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'artworks', label: 'Artworks' },
  { key: 'invitations', label: 'Invitations' },
  { key: 'catalogue', label: 'Catalogue' },
  { key: 'edit', label: 'Edit' },
] as const;
type Tab = (typeof TABS)[number]['key'];

function lifecycle(start: string | null, end: string | null) {
  const today = new Date().toISOString().slice(0, 10);
  if (start && start > today) return 'Upcoming';
  if (end && end < today) return 'Completed';
  if (start || end) return 'Active';
  return 'Undated';
}

export default async function ExhibitionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab: rawTab }] = await Promise.all([params, searchParams]);
  const supabase = await requireOwnerPage();
  const isNew = id === 'new';

  const [{ data: exhibition }, { data: artworks }] = await Promise.all([
    isNew ? Promise.resolve({ data: null }) : supabase.from('exhibitions').select('*').eq('id', id).maybeSingle(),
    supabase.from('artworks').select('id, title, image_url, year, status').order('title'),
  ]);
  if (!isNew && !exhibition) notFound();

  const probe = await supabase.from('exhibitions').select('is_published').limit(1);
  const canPublish = !probe.error;
  const atomic = await supabase.from('exhibition_artworks').select('position').limit(1);
  const atomicReady = !isMissingSchema(atomic.error);

  if (isNew) {
    return (
      <div className="space-y-6">
        <Link href="/studio/exhibitions" className="inline-flex items-center gap-1 text-sm text-[color:var(--studio-muted)] hover:text-[color:var(--studio-ink)]"><ArrowLeft className="h-4 w-4" aria-hidden />Exhibitions</Link>
        <PageHeader title="New exhibition" description="Details, dates and the works on show. New exhibitions stay unpublished until you choose otherwise." />
        {!canPublish && <SetupNotice title="Publishing is waiting for the database update">{MIGRATION_HINT}</SetupNotice>}
        <section className="studio-card p-5 sm:p-6"><ExhibitionForm canPublish={canPublish} artworks={artworks ?? []} /></section>
      </div>
    );
  }

  const tab: Tab = (TABS.find((t) => t.key === rawTab)?.key ?? 'overview') as Tab;
  const ordered = await loadOrderedArtworks(supabase, id);
  const drafts = await supabase
    .from('email_campaign_drafts')
    .select('id, title, subject, updated_at, revision')
    .eq('exhibition_id', id)
    .order('updated_at', { ascending: false });
  const draftsMissing = isMissingSchema(drafts.error);
  const dates = exhibitionDates(exhibition.start_date, exhibition.end_date);
  const where = [exhibition.venue, exhibition.location].filter(Boolean).join(', ');
  const fileName = (exhibition.slug ?? exhibition.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'exhibition';

  return (
    <div className="space-y-6">
      <Link href="/studio/exhibitions" className="inline-flex items-center gap-1 text-sm text-[color:var(--studio-muted)] hover:text-[color:var(--studio-ink)]"><ArrowLeft className="h-4 w-4" aria-hidden />Exhibitions</Link>
      <PageHeader
        title={exhibition.title}
        description={[dates, where].filter(Boolean).join(' · ') || 'No dates or venue yet.'}
        actions={
          exhibition.is_published && exhibition.slug ? (
            <a href={`/exhibitions/${exhibition.slug}`} target="_blank" rel="noreferrer" className="studio-btn-secondary"><ExternalLink className="h-4 w-4" aria-hidden />Public page</a>
          ) : undefined
        }
      />
      {!atomicReady && <SetupNotice title="Artwork order and safe saving need the database update">Apply supabase/migrations/20261030000000_studio_workflows.sql. Until then the order is not stored and saves are checked step by step.</SetupNotice>}

      <nav aria-label="Exhibition sections" className="studio-tabs">
        {TABS.map((t) => (
          <Link key={t.key} href={`/studio/exhibitions/${id}?tab=${t.key}`} aria-current={tab === t.key ? 'page' : undefined} className="studio-tab">
            {t.label}
            {t.key === 'artworks' && <span className="ml-1.5 tabular-nums text-[color:var(--studio-muted)]">{ordered.length}</span>}
          </Link>
        ))}
      </nav>

      {tab === 'overview' && (
        <section className="grid gap-5 lg:grid-cols-3">
          <div className="studio-card space-y-4 p-5 lg:col-span-2">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="studio-label">Venue</dt><dd className="mt-1">{where || '—'}</dd></div>
              <div><dt className="studio-label">Dates</dt><dd className="mt-1">{dates || '—'}</dd></div>
              <div><dt className="studio-label">Status</dt><dd className="mt-1"><span className="studio-pill">{lifecycle(exhibition.start_date, exhibition.end_date)}</span></dd></div>
              <div><dt className="studio-label">Website</dt><dd className="mt-1"><span className={exhibition.is_published ? 'studio-pill studio-pill-success' : 'studio-pill'}>{exhibition.is_published ? 'Published' : 'Not published'}</span></dd></div>
            </dl>
            {exhibition.description && <p className="whitespace-pre-line text-sm leading-6 text-[color:var(--studio-muted)]">{exhibition.description}</p>}
          </div>
          <div className="studio-card space-y-3 p-5">
            <h2 className="text-base font-semibold">Next steps</h2>
            <Link href={`/studio/exhibitions/${id}?tab=artworks`} className="block text-sm underline">Choose and order the works ({ordered.length})</Link>
            <Link href={`/studio/exhibitions/${id}?tab=catalogue`} className="block text-sm underline">Generate the catalogue</Link>
            <Link href={`/studio/exhibitions/${id}?tab=invitations`} className="block text-sm underline">Prepare the invitation</Link>
          </div>
        </section>
      )}

      {tab === 'artworks' && (
        <section className="studio-card p-5">
          {ordered.length === 0 ? (
            <p className="text-sm text-[color:var(--studio-muted)]">No works yet. <Link href={`/studio/exhibitions/${id}?tab=edit`} className="underline">Add works</Link>.</p>
          ) : (
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ordered.map((a, i) => (
                <li key={a.id}>
                  <Link href={`/studio/archive/${a.id}`} className="block">
                    <div className="aspect-square overflow-hidden rounded-xl bg-[#efece8] p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {a.image_url && <img src={a.image_url} alt="" className="h-full w-full object-contain" />}
                    </div>
                    <p className="mt-2 text-sm font-medium"><span className="tabular-nums text-[color:var(--studio-muted)]">{i + 1}.</span> {a.title}</p>
                    <p className="text-xs text-[color:var(--studio-muted)]">{[a.year, a.status].filter(Boolean).join(' · ')}</p>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {tab === 'invitations' && (
        <section className="studio-card space-y-5 p-5">
          {draftsMissing ? (
            <SetupNotice title="Invitation drafts need the database update">Apply supabase/migrations/20261030000000_studio_workflows.sql.</SetupNotice>
          ) : (
            <>
              <InvitationAction exhibitionId={id} hasDraft={(drafts.data ?? []).length > 0} />
              {(drafts.data ?? []).length > 0 && (
                <ul className="divide-y divide-[color:var(--studio-line)] rounded-xl border border-[color:var(--studio-line)]">
                  {(drafts.data ?? []).map((d) => (
                    <li key={d.id} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <span><span className="font-medium">{d.subject || d.title}</span> <span className="text-xs text-[color:var(--studio-muted)]">· draft, revision {d.revision} · {new Date(d.updated_at).toLocaleDateString('en-GB')}</span></span>
                      <Link href={`/studio/email?draft=${d.id}&from=${id}`} className="text-sm underline">Open in Email Studio</Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}

      {tab === 'catalogue' && (
        <section className="studio-card space-y-3 p-5">
          <p className="text-sm text-[color:var(--studio-muted)]">Uses the same catalogue design as the Archive, with the exhibition on the cover and the works in their exhibition order. Prices follow the archive&apos;s &ldquo;show price on PDF&rdquo; setting.</p>
          <CatalogueAction artworkIds={ordered.map((a) => a.id)} title={exhibition.title} subtitle={[where, dates].filter(Boolean).join(' · ')} fileName={fileName} />
        </section>
      )}

      {tab === 'edit' && (
        <section className="studio-card p-5 sm:p-6">
          {!canPublish && <div className="mb-4"><SetupNotice title="Publishing is waiting for the database update">{MIGRATION_HINT}</SetupNotice></div>}
          <ExhibitionForm canPublish={canPublish} artworks={artworks ?? []} initial={{ ...exhibition, artwork_ids: ordered.map((a) => a.id) }} />
        </section>
      )}
    </div>
  );
}
