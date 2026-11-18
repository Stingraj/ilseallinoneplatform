import { Share2 } from 'lucide-react';
import { EmptyState } from '@/components/studio/empty-state';
import { PageHeader } from '@/components/studio/page-header';
import { SetupNotice } from '@/components/studio/setup-notice';
import { isMissingSchema, requireOwnerPage } from '@/lib/studio/data';
import { roomState } from '@/lib/viewing-rooms/tokens';
import { ShareBuilder } from './share-builder';
import { ShareRowActions } from './share-row-actions';

export const dynamic = 'force-dynamic';

const STATE_LABEL = { open: 'Open', expired: 'Expired', revoked: 'Revoked', inactive: 'Closed' } as const;

export default async function SharesPage() {
  const supabase = await requireOwnerPage();
  const [shares, artworks, contacts] = await Promise.all([
    supabase
      .from('file_shares')
      .select('id, title, created_at, expires_at, revoked_at, passcode, file_share_items(count), file_share_downloads(created_at)')
      .order('created_at', { ascending: false }),
    supabase.from('artworks').select('id, title, image_url').not('image_url', 'is', null).order('title'),
    supabase.from('contacts').select('id, name').order('name'),
  ]);
  const missing = isMissingSchema(shares.error);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Share files"
        description="Send high-resolution images, press kits or documents to a gallery, journalist or collector with a private link. Links can expire, need a passcode, and be withdrawn; every download is recorded."
      />
      {missing && <SetupNotice title="File sharing is waiting for the database update">Apply supabase/migrations/20261118000000_studio_quick_wins.sql (staging first).</SetupNotice>}
      <div className="grid gap-6 xl:grid-cols-5">
        <section className="studio-card p-6 xl:col-span-2" aria-labelledby="new-share">
          <h2 id="new-share" className="mb-5 font-studio text-lg font-semibold">New share</h2>
          {missing ? (
            <p className="text-sm text-slate-500">Available after the database update.</p>
          ) : (
            <ShareBuilder artworks={(artworks.data ?? []).map((a) => ({ id: a.id, title: a.title }))} contacts={contacts.data ?? []} />
          )}
        </section>
        <section className="xl:col-span-3" aria-labelledby="share-list">
          <h2 id="share-list" className="sr-only">Shares</h2>
          {(shares.data ?? []).length === 0 ? (
            <EmptyState icon={Share2} title="Nothing shared yet">Create a share and send the link by email or message.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {(shares.data ?? []).map((share) => {
                const state = roomState({ is_active: true, revoked_at: share.revoked_at, expires_at: share.expires_at });
                const items = (share.file_share_items as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
                const downloads = (share.file_share_downloads ?? []) as { created_at: string }[];
                const last = downloads.map((d) => d.created_at).sort().at(-1);
                return (
                  <li key={share.id} className="studio-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{share.title}</p>
                      <p className="text-xs text-slate-400">
                        {items} file{items === 1 ? '' : 's'} · created {share.created_at.slice(0, 10)}
                        {share.expires_at && ` · until ${share.expires_at.slice(0, 10)}`}
                        {share.passcode && ' · passcode'}
                        {` · ${downloads.length} download${downloads.length === 1 ? '' : 's'}`}
                        {last && `, last ${last.slice(0, 10)}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`studio-pill ${state === 'open' ? 'studio-pill-success' : 'studio-pill-warning'}`}>{STATE_LABEL[state]}</span>
                      <ShareRowActions id={share.id} open={state === 'open'} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
