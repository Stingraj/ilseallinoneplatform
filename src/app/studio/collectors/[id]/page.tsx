import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { PageHeader } from '@/components/studio/page-header';
import { SetupNotice } from '@/components/studio/setup-notice';
import { formatCurrency } from '@/lib/catalog';
import { MIGRATION_HINT, isMissingSchema, requireOwnerPage } from '@/lib/studio/data';
import { CollectorForm } from '../collector-form';
import { InteractionForm } from './interaction-form';

export const dynamic = 'force-dynamic';

export default async function CollectorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await requireOwnerPage();
  const { data: contact } = await supabase.from('contacts').select('*').eq('id', id).maybeSingle();
  if (!contact) notFound();

  const [interactions, enquiries, sales] = await Promise.all([
    supabase.from('contact_interactions').select('*, artworks(title)').eq('contact_id', id).order('occurred_at', { ascending: false }),
    supabase.from('enquiries').select('id, message, status, created_at, artworks(title)').eq('contact_id', id).order('created_at', { ascending: false }),
    supabase.from('sales').select('id, sale_price, sale_date, status, artworks(title, currency)').eq('contact_id', id).order('sale_date', { ascending: false }),
  ]);
  const historyMissing = isMissingSchema(interactions.error);

  type Entry = { id: string; when: string; kind: string; text: string };
  const timeline: Entry[] = [
    ...(interactions.data ?? []).map((i) => ({ id: `i-${i.id}`, when: i.occurred_at, kind: i.kind, text: i.summary })),
    ...(enquiries.data ?? []).map((e) => ({ id: `e-${e.id}`, when: e.created_at, kind: 'enquiry', text: e.message })),
  ].sort((a, b) => b.when.localeCompare(a.when));

  return (
    <div className="space-y-6">
      <Link href="/studio/collectors" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Collectors
      </Link>
      <PageHeader
        title={contact.name}
        description={[contact.company, contact.location, contact.type].filter(Boolean).join(' · ')}
        actions={
          <>
            {contact.email && <a href={`mailto:${contact.email}`} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium"><Mail className="h-4 w-4" aria-hidden />Email</a>}
            {contact.phone && <a href={`tel:${contact.phone}`} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium"><Phone className="h-4 w-4" aria-hidden />Call</a>}
          </>
        }
      />
      {historyMissing && <SetupNotice title="Interaction history needs the database update">{MIGRATION_HINT}</SetupNotice>}

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="studio-card p-6 xl:col-span-3" aria-labelledby="details">
          <h2 id="details" className="mb-5 font-studio text-lg font-semibold">Details</h2>
          <CollectorForm initial={contact} />
        </section>

        <div className="space-y-6 xl:col-span-2">
          <section className="studio-card p-6" aria-labelledby="purchases">
            <h2 id="purchases" className="mb-4 font-studio text-lg font-semibold">Purchases</h2>
            {(sales.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No sales linked to this collector yet. Link sales from the Sales tracker or an invoice.</p>
            ) : (
              <ul className="space-y-2">
                {(sales.data ?? []).map((sale) => {
                  const artwork = Array.isArray(sale.artworks) ? sale.artworks[0] : sale.artworks;
                  return (
                    <li key={sale.id} className="flex justify-between rounded-xl bg-[#E3F7EE] p-3 text-sm">
                      <span className="font-medium">{artwork?.title ?? 'Artwork'}</span>
                      <span>{sale.sale_price ? formatCurrency(Number(sale.sale_price), artwork?.currency ?? 'USD') : '—'}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="studio-card p-6" aria-labelledby="history">
            <h2 id="history" className="mb-4 font-studio text-lg font-semibold">History</h2>
            {!historyMissing && <InteractionForm contactId={id} />}
            <ol className="mt-6 space-y-4 border-l-2 border-[#7FD8B0] pl-4">
              {timeline.map((entry) => (
                <li key={entry.id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {entry.kind} · {new Date(entry.when).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{entry.text}</p>
                </li>
              ))}
              {timeline.length === 0 && <li className="text-sm text-slate-500">No history yet.</li>}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
