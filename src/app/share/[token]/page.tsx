import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site/config';
import { loadShare } from '@/lib/shares/server';
import { formatBytes } from '@/lib/tools/format';
import { SharePasscodeForm } from './passcode-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Shared files', robots: { index: false, follow: false, nocache: true }, referrer: 'no-referrer' };

const CLOSED_COPY = {
  expired: 'This link has expired.',
  revoked: 'This link is no longer available.',
  inactive: 'This link is not open at the moment.',
} as const;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site min-h-screen">
      <header className="site-container flex h-20 items-center justify-between">
        <Link href="/" className="font-display text-xl">{SITE.artistName}</Link>
        <span className="eyebrow">Shared files</span>
      </header>
      <main id="main" className="site-container pb-28 pt-10">{children}</main>
    </div>
  );
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await loadShare(token);

  if (result.kind === 'not_found' || result.kind === 'closed') {
    return (
      <Shell>
        <h1 className="display-lg max-w-3xl">{result.kind === 'closed' ? CLOSED_COPY[result.state] : 'This link is not valid.'}</h1>
        <p className="mt-6 max-w-md text-stone">If you were expecting files here, please contact the studio and a new link will be sent to you.</p>
        <Link href="/contact" className="link-underline mt-8 inline-block text-[12px] uppercase tracking-[0.22em]">Contact the studio</Link>
      </Shell>
    );
  }

  if (result.kind === 'passcode') {
    return (
      <Shell>
        <p className="eyebrow">Prepared for you</p>
        <h1 className="display-lg mt-4 max-w-3xl">{result.title}</h1>
        <p className="mt-6 max-w-md text-stone">Please enter the passcode you received with this link.</p>
        <SharePasscodeForm token={token} />
      </Shell>
    );
  }

  const { share, items } = result;
  return (
    <Shell>
      <p className="eyebrow">Prepared for you</p>
      <h1 className="display-lg mt-4 max-w-4xl">{share.title}</h1>
      {share.message && <p className="mt-8 max-w-2xl whitespace-pre-line text-[16px] leading-8 text-ink/80">{share.message}</p>}
      {share.expiresAt && (
        <p className="mt-4 text-sm text-stone">Available until {new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(share.expiresAt))}</p>
      )}
      <ul className="mt-14 max-w-3xl divide-y divide-ink/15 border-y border-ink/15">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-6 py-5">
            <span className="min-w-0">
              <span className="block truncate text-[16px]">{item.fileName}</span>
              <span className="text-sm text-stone">{item.isArtwork ? 'Artwork image' : item.sizeBytes ? formatBytes(item.sizeBytes) : 'File'}</span>
            </span>
            <a href={`/share/${token}/download/${item.id}`} className="shrink-0 border border-ink px-5 py-2.5 text-[12px] font-medium uppercase tracking-[0.18em] hover:bg-ink hover:text-paper">
              Download
            </a>
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="mt-12 text-stone">The files for this link are being prepared.</p>}
      <p className="mt-10 max-w-xl text-sm text-stone">
        Images remain © {SITE.artistName}. Please credit the artist and ask the studio before using them beyond the purpose they were shared for.
      </p>
    </Shell>
  );
}
