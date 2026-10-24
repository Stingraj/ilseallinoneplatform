import { PageHeader } from '@/components/studio/page-header';
import { SetupNotice } from '@/components/studio/setup-notice';
import { EmailStudioApp } from '@/components/email-studio/EmailStudioApp';
import { resolveDispatchTarget } from '@/lib/email/dispatch';

export const dynamic = 'force-dynamic';

export default function EmailStudioPage() {
  const target = resolveDispatchTarget(process.env);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Studio"
        description="Import recipients, design the email, then send it through your n8n workflow."
      />
      {!target.url && (
        <SetupNotice title="Sending is not connected yet">
          {target.reason} You can still build and preview campaigns.
        </SetupNotice>
      )}
      {target.mode === 'test' && target.url && (
        <SetupNotice title="Test mode">Campaigns go to the n8n test workflow only, never to the live list.</SetupNotice>
      )}
      <EmailStudioApp />
    </div>
  );
}
