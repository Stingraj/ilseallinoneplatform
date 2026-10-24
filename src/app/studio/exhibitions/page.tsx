import Link from 'next/link';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/studio/empty-state';
import { PageHeader } from '@/components/studio/page-header';
import { requireOwnerPage } from '@/lib/studio/data';

export const dynamic = 'force-dynamic';

export default async function ExhibitionsPage() {
  const supabase = await requireOwnerPage();
  const { data } = await supabase.from('exhibitions').select('*, exhibition_artworks(artwork_id)').order('start_date', { ascending: false, nullsFirst: true });
  const today = new Date().toISOString().slice(0, 10);
  const exhibitions = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exhibitions"
        description="Plan shows, choose the works, and publish them to the website when you are ready."
        actions={<Button asChild className="bg-slate-900 text-white"><Link href="/studio/exhibitions/new"><Plus className="mr-1 h-4 w-4" aria-hidden />New exhibition</Link></Button>}
      />
      {exhibitions.length === 0 ? (
        <EmptyState icon={Building2} title="No exhibitions yet" action={<Button asChild><Link href="/studio/exhibitions/new">Create one</Link></Button>} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {exhibitions.map((exhibition) => {
            const upcoming = !exhibition.end_date || exhibition.end_date >= today;
            return (
              <li key={exhibition.id}>
                <Link href={`/studio/exhibitions/${exhibition.id}`} className="studio-card block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="aspect-[16/9] bg-[#FFF3EB]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {exhibition.cover_image_url && <img src={exhibition.cover_image_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="p-4">
                    <div className="mb-2 flex gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${upcoming ? 'bg-[#FFB38A] text-slate-900' : 'bg-slate-100 text-slate-500'}`}>{upcoming ? 'Upcoming' : 'Past'}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${exhibition.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{exhibition.is_published ? 'On website' : 'Draft'}</span>
                    </div>
                    <p className="font-studio text-lg font-semibold text-slate-900">{exhibition.title}</p>
                    <p className="text-sm text-slate-500">{[exhibition.venue, exhibition.start_date && `${exhibition.start_date}${exhibition.end_date ? ` → ${exhibition.end_date}` : ''}`].filter(Boolean).join(' · ')}</p>
                    <p className="mt-2 text-xs text-slate-400">{exhibition.exhibition_artworks?.length ?? 0} artworks</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
