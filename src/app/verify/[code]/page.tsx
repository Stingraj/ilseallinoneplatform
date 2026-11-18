import type { Metadata } from 'next';
import Link from 'next/link';
import { ArtworkImage } from '@/components/site/artwork-image';
import { isWellFormedVerifyCode, publicCertificateFields } from '@/lib/certificates/codes';
import { SITE } from '@/lib/site/config';
import { getServiceRoleClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Certificate check', robots: { index: false, follow: false, nocache: true }, referrer: 'no-referrer' };

type Lookup =
  | { kind: 'not_found' }
  | { kind: 'found'; number: string; issuedOn: string; revoked: boolean; work: ReturnType<typeof publicCertificateFields> };

/** Certificates are invisible to the anonymous role; this server-side lookup returns only allow-listed fields. */
async function lookup(code: string): Promise<Lookup> {
  if (!isWellFormedVerifyCode(code)) return { kind: 'not_found' };
  const { client } = getServiceRoleClient();
  if (!client) return { kind: 'not_found' };
  const { data } = await client
    .from('artwork_certificates')
    .select('certificate_number, issued_on, revoked_at, details')
    .eq('verify_code', code)
    .maybeSingle();
  if (!data) return { kind: 'not_found' };
  return { kind: 'found', number: data.certificate_number, issuedOn: data.issued_on, revoked: Boolean(data.revoked_at), work: publicCertificateFields(data.details) };
}

export default async function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await lookup(code);

  return (
    <div className="site min-h-screen">
      <header className="site-container flex h-20 items-center justify-between">
        <Link href="/" className="font-display text-xl">{SITE.artistName}</Link>
        <span className="eyebrow">Certificate check</span>
      </header>
      <main id="main" className="site-container pb-28 pt-10">
        {result.kind === 'not_found' ? (
          <>
            <h1 className="display-lg max-w-3xl">No certificate matches this code.</h1>
            <p className="mt-6 max-w-md text-stone">Check that the address was typed exactly as printed on the certificate, or contact the studio.</p>
            <Link href="/contact" className="link-underline mt-8 inline-block text-[12px] uppercase tracking-[0.22em]">Contact the studio</Link>
          </>
        ) : (
          <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
            {result.work.imageUrl && (
              <div className="relative aspect-[4/5] bg-[#E9E4DD] lg:col-span-5">
                <ArtworkImage src={result.work.imageUrl} alt={result.work.title ?? 'Artwork'} sizes="(min-width: 1024px) 40vw, 100vw" fit="contain" priority />
              </div>
            )}
            <div className="lg:col-span-6 lg:col-start-7">
              <p className={`eyebrow ${result.revoked ? 'text-signal' : ''}`}>{result.revoked ? 'This certificate has been withdrawn' : 'Certificate is valid'}</p>
              <h1 className="mt-4 font-display text-5xl font-light italic">{result.work.title}</h1>
              <dl className="mt-8 grid grid-cols-[8rem_1fr] gap-y-3 text-[15px]">
                {([
                  ['Artist', result.work.artist],
                  ['Year', result.work.year],
                  ['Medium', result.work.medium],
                  ['Dimensions', result.work.dimensions],
                  ['Edition', result.work.edition],
                  ['Certificate', result.number],
                  ['Issued', result.issuedOn],
                ] as const).filter(([, value]) => value).map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-stone">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              {result.revoked && (
                <p className="mt-8 max-w-md text-stone">The studio has withdrawn this certificate. If you hold this work, please contact the studio.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
