import type { Metadata } from 'next';
import { isWellFormedUnsubscribeToken } from '@/lib/email/unsubscribe';
import { UnsubscribeForm } from './unsubscribe-form';

export const metadata: Metadata = {
  title: 'Unsubscribe',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export const dynamic = 'force-dynamic';

// Opening the link changes nothing; only the confirmation button (POST) unsubscribes.
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return (
    <div className="site-container min-h-[70vh] pb-28 pt-32 sm:pt-40">
      <p className="eyebrow">Email preferences</p>
      <h1 className="display-lg mt-4">Unsubscribe</h1>
      <div className="mt-10">
        {isWellFormedUnsubscribeToken(t) ? (
          <UnsubscribeForm token={t} />
        ) : (
          <p className="max-w-md text-[15px] leading-7 text-ink/80">This link is incomplete. Please use the unsubscribe link from the email exactly as it arrived.</p>
        )}
      </div>
    </div>
  );
}
