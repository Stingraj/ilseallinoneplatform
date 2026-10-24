import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { EmptyState } from '@/components/studio/empty-state';
import { PageHeader } from '@/components/studio/page-header';
import { SetupNotice } from '@/components/studio/setup-notice';
import { MIGRATION_HINT, isMissingSchema, requireOwnerPage } from '@/lib/studio/data';
import { StatusSelect } from './status-select';

export const dynamic = 'force-dynamic';

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const supabase = await requireOwnerPage();
  let query = supabase.from('enquiries').select('*, artworks(title, slug)').order('created_at', { ascending: false }).limit(300);
  if (status) query = query.eq('status', status);
  else query = query.neq('status', 'spam');
  const { data, error } = await query;

  return (
    <div className="space-y-6">
      <PageHeader title="Enquiries" description="Messages from the website, linked to the collector who sent them and the artwork they asked about." />
      {isMissingSchema(error) && <SetupNotice title="Enquiries need the database update">{MIGRATION_HINT} Until then, website messages are saved as collector notes, as before.</SetupNotice>}
      <nav className="flex flex-wrap gap-2" aria-label="Filter enquiries">
        {[[undefined, 'Open'], ['new', 'New'], ['follow_up', 'Follow up'], ['closed', 'Closed'], ['spam', 'Spam']].map(([key, label]) => (
          <Link key={label} href={key ? `/studio/enquiries?status=${key}` : '/studio/enquiries'} aria-current={status === key ? 'true' : undefined}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status === key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
            {label}
          </Link>
        ))}
      </nav>
      {(data ?? []).length === 0 ? (
        <EmptyState icon={Inbox} title="No enquiries here">New messages from the contact form and artwork pages appear here.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((enquiry) => {
            const artwork = Array.isArray(enquiry.artworks) ? enquiry.artworks[0] : enquiry.artworks;
            return (
              <li key={enquiry.id} className="studio-card p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {enquiry.contact_id ? <Link href={`/studio/collectors/${enquiry.contact_id}`} className="hover:underline">{enquiry.name}</Link> : enquiry.name}
                      <span className="ml-2 text-sm font-normal text-slate-400">{enquiry.email}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {new Date(enquiry.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                      {artwork && <> · about <span className="font-medium text-slate-600">{artwork.title}</span></>}
                      {enquiry.source_page && <> · from {enquiry.source_page}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`mailto:${enquiry.email}?subject=${encodeURIComponent(artwork ? `Re: ${artwork.title}` : 'Re: your enquiry')}`} className="rounded-full bg-[#FDE7E6] px-3 py-1.5 text-xs font-semibold text-slate-800">Reply</a>
                    <StatusSelect id={enquiry.id} value={enquiry.status} />
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{enquiry.message}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
