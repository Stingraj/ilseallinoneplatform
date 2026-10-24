import Link from 'next/link';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/studio/empty-state';
import { PageHeader } from '@/components/studio/page-header';
import { SetupNotice } from '@/components/studio/setup-notice';
import { MIGRATION_HINT, isMissingSchema, requireOwnerPage } from '@/lib/studio/data';
import { NewCollectorButton } from './new-collector-button';

export const dynamic = 'force-dynamic';

const TYPES = ['all', 'collector', 'gallery', 'curator', 'buyer', 'lead', 'vendor'];

export default async function CollectorsPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const { q, type } = await searchParams;
  const supabase = await requireOwnerPage();

  let query = supabase.from('contacts').select('*').order('updated_at', { ascending: false }).limit(500);
  if (type && type !== 'all') query = query.eq('type', type);
  if (q) query = query.or(`name.ilike.%${q.replace(/[%,()]/g, '')}%,email.ilike.%${q.replace(/[%,()]/g, '')}%,company.ilike.%${q.replace(/[%,()]/g, '')}%`);
  const { data, error } = await query;
  const contacts = data ?? [];
  const crmColumnsMissing = contacts.length > 0 && !('consent_marketing' in contacts[0]);

  return (
    <div className="space-y-6">
      <PageHeader title="Collectors" description="Everyone you work with: collectors, galleries, curators and new leads from the website." actions={<NewCollectorButton />} />
      {(crmColumnsMissing || isMissingSchema(error)) && <SetupNotice title="Interests, tags and consent need the database update">{MIGRATION_HINT}</SetupNotice>}
      {error && !isMissingSchema(error) && <SetupNotice title="Could not load collectors">{error.message}</SetupNotice>}

      <form className="flex flex-col gap-3 sm:flex-row" role="search">
        <input name="q" defaultValue={q} placeholder="Search name, email or organisation" className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm" aria-label="Search collectors" />
        <select name="type" defaultValue={type ?? 'all'} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm capitalize" aria-label="Type">
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="h-10 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white">Filter</button>
      </form>

      {contacts.length === 0 ? (
        <EmptyState icon={Users} title={q || type ? 'No one matches' : 'No collectors yet'}>
          Enquiries from the website create collector records automatically, or add someone yourself.
        </EmptyState>
      ) : (
        <div className="studio-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">Status</th>
                <th className="hidden px-4 py-3 font-semibold lg:table-cell">Interests</th>
                <th className="px-4 py-3 font-semibold">Email consent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/studio/collectors/${contact.id}`} className="font-semibold text-slate-800 hover:underline">{contact.name}</Link>
                    <p className="text-xs text-slate-400">{[contact.email, contact.company].filter(Boolean).join(' · ')}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">
                    <span className="rounded-full bg-[#E3F7EE] px-2.5 py-1 text-xs font-semibold text-emerald-800">{contact.type}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{contact.follow_up_status ?? '—'}</td>
                  <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">{(contact.interests ?? []).join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {contact.unsubscribed_at ? <span className="text-slate-400">Unsubscribed</span> : contact.consent_marketing ? <span className="font-semibold text-emerald-700">Yes</span> : <span className="text-slate-400">No</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
