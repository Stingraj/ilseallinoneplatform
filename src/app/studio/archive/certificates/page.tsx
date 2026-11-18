import { Award, Download } from 'lucide-react';
import { EmptyState } from '@/components/studio/empty-state';
import { PageHeader } from '@/components/studio/page-header';
import { SetupNotice } from '@/components/studio/setup-notice';
import { SITE } from '@/lib/site/config';
import { isMissingSchema, requireOwnerPage } from '@/lib/studio/data';
import { IssueCertificateForm } from './issue-form';
import { RevokeButton } from './revoke-button';

export const dynamic = 'force-dynamic';

export default async function CertificatesPage({ searchParams }: { searchParams: Promise<{ artwork?: string }> }) {
  const { artwork: preselected } = await searchParams;
  const supabase = await requireOwnerPage();
  const [certificates, artworks, contacts] = await Promise.all([
    supabase.from('artwork_certificates').select('id, certificate_number, verify_code, details, issued_to, issued_on, revoked_at').order('created_at', { ascending: false }),
    supabase.from('artworks').select('id, title, year').order('title'),
    supabase.from('contacts').select('id, name').order('name'),
  ]);
  const missing = isMissingSchema(certificates.error);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificates of authenticity"
        description="Issue a signed certificate for a work. Each has a QR code that opens a page confirming it is genuine, and can be withdrawn if needed."
      />
      {missing && (
        <SetupNotice title="Certificates are waiting for the database update">Apply supabase/migrations/20261118000000_studio_quick_wins.sql (staging first).</SetupNotice>
      )}
      <div className="grid gap-6 xl:grid-cols-5">
        <section className="studio-card p-6 xl:col-span-2" aria-labelledby="issue-certificate">
          <h2 id="issue-certificate" className="mb-5 font-studio text-lg font-semibold">Issue a certificate</h2>
          {missing ? (
            <p className="text-sm text-slate-500">Available after the database update.</p>
          ) : (
            <IssueCertificateForm
              artworks={(artworks.data ?? []).map((a) => ({ id: a.id, label: a.year ? `${a.title} (${a.year})` : a.title }))}
              contacts={contacts.data ?? []}
              preselected={preselected}
            />
          )}
          <p className="mt-4 text-xs text-slate-500">
            The certificate records the artwork&apos;s details as they are today. Print it, sign it by hand, and keep a copy. The QR code links to {SITE.url.replace(/^https?:\/\//, '')}/verify/…
          </p>
        </section>

        <section className="xl:col-span-3" aria-labelledby="certificate-list">
          <h2 id="certificate-list" className="sr-only">Issued certificates</h2>
          {(certificates.data ?? []).length === 0 ? (
            <EmptyState icon={Award} title="No certificates yet">Issue one when a work is sold or delivered.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {(certificates.data ?? []).map((certificate) => {
                const details = (certificate.details ?? {}) as { title?: string };
                return (
                  <li key={certificate.id} className="studio-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{details.title ?? 'Artwork'}</p>
                      <p className="text-xs text-slate-400">
                        {certificate.certificate_number} · issued {certificate.issued_on}
                        {certificate.issued_to && ` · to ${certificate.issued_to}`}
                      </p>
                      {certificate.revoked_at && <span className="studio-pill studio-pill-danger mt-1 inline-block">Withdrawn</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={`/verify/${certificate.verify_code}`} target="_blank" rel="noreferrer" className="text-xs underline">Check page</a>
                      <a href={`/api/studio/certificates/${certificate.id}/pdf`} className="inline-flex h-8 items-center gap-1 rounded-full bg-[#E3F7EE] px-3 text-xs font-semibold text-slate-800">
                        <Download className="h-3.5 w-3.5" aria-hidden /> PDF
                      </a>
                      {!certificate.revoked_at && <RevokeButton id={certificate.id} number={certificate.certificate_number} />}
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
