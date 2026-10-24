import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/studio/page-header';
import { SetupNotice } from '@/components/studio/setup-notice';
import { MIGRATION_HINT, requireOwnerPage } from '@/lib/studio/data';
import { ExhibitionForm } from '../exhibition-form';

export const dynamic = 'force-dynamic';

export default async function ExhibitionEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await requireOwnerPage();
  const isNew = id === 'new';
  const [{ data: exhibition }, { data: artworks }] = await Promise.all([
    isNew ? Promise.resolve({ data: null }) : supabase.from('exhibitions').select('*, exhibition_artworks(artwork_id)').eq('id', id).maybeSingle(),
    supabase.from('artworks').select('id, title, image_url, year').order('title'),
  ]);
  if (!isNew && !exhibition) notFound();

  // Probe for the publishing column added by the Studio migration.
  const probe = await supabase.from('exhibitions').select('is_published').limit(1);
  const canPublish = !probe.error;

  return (
    <div className="space-y-6">
      <Link href="/studio/exhibitions" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" aria-hidden />Exhibitions</Link>
      <PageHeader title={isNew ? 'New exhibition' : exhibition!.title} description="Details, dates and the works on show." />
      {!canPublish && <SetupNotice title="Publishing is waiting for the database update">{MIGRATION_HINT}</SetupNotice>}
      <section className="studio-card p-6">
        <ExhibitionForm
          canPublish={canPublish}
          artworks={artworks ?? []}
          initial={exhibition ? { ...exhibition, artwork_ids: (exhibition.exhibition_artworks ?? []).map((link: { artwork_id: string }) => link.artwork_id) } : undefined}
        />
      </section>
      {exhibition?.is_published && exhibition.slug && (
        <a href={`/exhibitions/${exhibition.slug}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-600 underline">View on the website</a>
      )}
    </div>
  );
}
