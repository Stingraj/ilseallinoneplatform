import Link from 'next/link';
import { ExternalLink, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/studio/page-header';
import { SetupNotice } from '@/components/studio/setup-notice';
import { isMissingSchema, requireOwnerPage } from '@/lib/studio/data';
import { WebsiteControls, type WebsiteArtworkRow } from './website-controls';

export const dynamic = 'force-dynamic';

export default async function WebsitePage() {
  const supabase = await requireOwnerPage();
  let publishingEnabled = true;
  let result = await supabase
    .from('artworks')
    .select('id, slug, title, status, image_url, year, is_public, is_featured, is_price_visible')
    .order('title');

  if (isMissingSchema(result.error)) {
    // Before the migration there is no is_public/slug: the website shows featured + Available works only.
    publishingEnabled = false;
    result = await supabase.from('artworks').select('id, title, status, image_url, year, is_featured, is_price_visible').order('title') as typeof result;
  }

  const rows: WebsiteArtworkRow[] = (result.data ?? []).map((row) => ({
    ...row,
    slug: row.slug ?? null,
    is_public: publishingEnabled ? Boolean(row.is_public) : row.status === 'Available' && Boolean(row.is_featured),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website"
        description="Choose what visitors see. Changes appear on the public site straight away."
        actions={
          <>
            <Button asChild variant="outline"><Link href="/studio/website/profile"><UserRound className="mr-2 h-4 w-4" aria-hidden />Artist profile</Link></Button>
            <Button asChild className="bg-slate-900 text-white"><a href="/" target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" aria-hidden />Preview site</a></Button>
          </>
        }
      />
      {!publishingEnabled && (
        <SetupNotice title="Publishing controls are waiting for the database update">
          Until the Studio migration is applied, the website shows only works that are both Available and Featured, as the old portfolio did.
          Featured and price settings below already work.
        </SetupNotice>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="studio-card p-4"><p className="text-xs text-slate-400">On website</p><p className="font-studio text-2xl font-bold">{rows.filter((r) => r.is_public).length}</p></div>
        <div className="studio-card p-4"><p className="text-xs text-slate-400">Featured on home page</p><p className="font-studio text-2xl font-bold">{rows.filter((r) => r.is_featured).length} / 10</p></div>
        <div className="studio-card p-4"><p className="text-xs text-slate-400">Prices shown</p><p className="font-studio text-2xl font-bold">{rows.filter((r) => r.is_public && r.is_price_visible !== false).length}</p></div>
      </div>
      <WebsiteControls artworks={rows} publishingEnabled={publishingEnabled} />
    </div>
  );
}
