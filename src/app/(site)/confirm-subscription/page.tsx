import type { Metadata } from 'next';
import { isWellFormedConfirmToken } from '@/lib/email/confirm';
import { ConfirmForm } from './confirm-form';

export const metadata: Metadata = {
  title: 'Confirm your subscription',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export const dynamic = 'force-dynamic';

// Opening the link changes nothing (mail scanners open links too); only the confirmation button (POST) subscribes.
export default async function ConfirmSubscriptionPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return (
    <div className="site-container min-h-[70vh] pb-28 pt-32 sm:pt-40">
      <p className="eyebrow">Studio news</p>
      <h1 className="display-lg mt-4">Confirm your subscription</h1>
      <div className="mt-10">
        {isWellFormedConfirmToken(t) ? (
          <ConfirmForm token={t} />
        ) : (
          <p className="max-w-md text-[15px] leading-7 text-ink/80">This link is incomplete. Please use the confirmation link from the email exactly as it arrived.</p>
        )}
      </div>
    </div>
  );
}
