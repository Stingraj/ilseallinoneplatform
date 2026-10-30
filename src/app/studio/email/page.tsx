import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ClientTabs } from '@/components/studio/client-tabs';
import { PageHeader } from '@/components/studio/page-header';
import { SetupNotice } from '@/components/studio/setup-notice';
import { EmailStudioApp } from '@/components/email-studio/EmailStudioApp';
import { AUTOMATIONS, automationTarget, type AutomationKind } from '@/lib/email/automations';
import { parseAllowlist } from '@/lib/email/eligibility';
import { resolveDispatchTarget } from '@/lib/email/dispatch';
import { isMissingSchema, requireOwnerPage } from '@/lib/studio/data';

export const dynamic = 'force-dynamic';

const STATE_LABEL: Record<string, string> = {
  dispatching: 'Sending to workflow',
  accepted_by_workflow: 'Accepted by workflow',
  failed: 'Failed',
  unknown: 'Unknown, check n8n',
};

const AUTOMATION_NOTES: Record<AutomationKind, string> = {
  enquiry: 'Sent automatically when someone uses a contact or artwork enquiry form.',
  welcome: 'Sent automatically when someone subscribes with consent.',
  exhibition_invite: 'Prepared as a draft from an exhibition (Exhibitions → Invitations); you send it here.',
  collection_announcement: 'Not triggered automatically. Write it here as a campaign.',
  collector_follow_up: 'Not triggered automatically. Write it here as a campaign.',
};

export default async function EmailStudioPage({ searchParams }: { searchParams: Promise<{ draft?: string; from?: string }> }) {
  const { draft: draftId, from } = await searchParams;
  const supabase = await requireOwnerPage();
  const target = resolveDispatchTarget(process.env);

  let initialDraft = null;
  let draftError: string | null = null;
  if (draftId && /^[0-9a-f-]{36}$/i.test(draftId)) {
    const { data, error } = await supabase
      .from('email_campaign_drafts')
      .select('id, subject, preview_text, template_type, template_data, raw_html')
      .eq('id', draftId)
      .maybeSingle();
    if (data) {
      initialDraft = { id: data.id, subject: data.subject, previewText: data.preview_text, templateType: data.template_type, templateData: data.template_data, rawHtml: data.raw_html };
    } else draftError = error ? 'The draft could not be loaded.' : 'This draft no longer exists.';
  }

  const operations = await supabase
    .from('email_dispatch_operations')
    .select('id, subject, dispatch_mode, state, eligible_count, excluded_count, http_status, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  const drafts = await supabase.from('email_campaign_drafts').select('id, title, kind, updated_at').order('updated_at', { ascending: false }).limit(20);
  const historyMissing = isMissingSchema(operations.error);
  const testAddresses = parseAllowlist(process.env.EMAIL_TEST_RECIPIENTS).length;

  const history = (
    <div className="space-y-5">
      {historyMissing ? (
        <SetupNotice title="Campaign history needs the database update">Apply supabase/migrations/20261030000000_studio_workflows.sql. Sending stays blocked until it can be recorded.</SetupNotice>
      ) : operations.error ? (
        <SetupNotice title="History could not be loaded">Please reload the page.</SetupNotice>
      ) : (operations.data ?? []).length === 0 ? (
        <p className="studio-card p-5 text-sm text-[color:var(--studio-muted)]">No campaigns have been sent from the studio yet.</p>
      ) : (
        <div className="studio-table-wrap" role="region" aria-label="Sent campaigns" tabIndex={0}>
          <table className="studio-table">
            <thead><tr><th>Subject</th><th>Date</th><th>Mode</th><th className="text-right">Recipients</th><th className="text-right">Left out</th><th>Status</th></tr></thead>
            <tbody>
              {(operations.data ?? []).map((op) => (
                <tr key={op.id}>
                  <td className="font-medium">{op.subject}</td>
                  <td className="whitespace-nowrap">{new Date(op.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td>{op.dispatch_mode === 'test' ? 'Test' : 'Live'}</td>
                  <td className="text-right tabular-nums">{op.eligible_count}</td>
                  <td className="text-right tabular-nums">{op.excluded_count}</td>
                  <td><span className={`studio-pill ${op.state === 'accepted_by_workflow' ? 'studio-pill-success' : op.state === 'failed' ? 'studio-pill-danger' : 'studio-pill-warning'}`}>{STATE_LABEL[op.state] ?? op.state}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-[color:var(--studio-muted)]">&ldquo;Accepted by workflow&rdquo; means n8n received the campaign. Delivery, opens and clicks are not reported by the current workflow, so they are not shown.</p>
      {!isMissingSchema(drafts.error) && (drafts.data ?? []).length > 0 && (
        <div className="studio-card p-5">
          <h2 className="mb-3 text-base font-semibold">Studio drafts</h2>
          <ul className="divide-y divide-[color:var(--studio-line)] text-sm">
            {(drafts.data ?? []).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 truncate">{d.title} <span className="text-xs text-[color:var(--studio-muted)]">· {d.kind.replace('_', ' ')}</span></span>
                <Link href={`/studio/email?draft=${d.id}`} className="shrink-0 underline">Open</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const automations = (
    <div className="studio-table-wrap" role="region" aria-label="Automations" tabIndex={0}>
      <table className="studio-table">
        <thead><tr><th>Automation</th><th>How it runs</th><th>n8n webhook</th></tr></thead>
        <tbody>
          {(Object.keys(AUTOMATIONS) as AutomationKind[]).map((kind) => {
            const t = automationTarget(kind);
            const status = t.mode === 'disabled' ? 'Sending off' : t.url ? (t.mode === 'test' ? 'Test workflow' : 'Configured, not verified') : 'Not configured';
            return (
              <tr key={kind}>
                <td className="font-medium">{AUTOMATIONS[kind].label}</td>
                <td className="text-[color:var(--studio-muted)]">{AUTOMATION_NOTES[kind]}</td>
                <td><span className={`studio-pill ${t.url ? '' : 'studio-pill-warning'}`}>{status}</span>{!t.url && t.mode === 'live' && <span className="ml-2 font-mono text-xs">{AUTOMATIONS[kind].env}</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {from && /^[0-9a-f-]{36}$/i.test(from) && (
        <Link href={`/studio/exhibitions/${from}?tab=invitations`} className="inline-flex items-center gap-1 text-sm text-[color:var(--studio-muted)] hover:text-[color:var(--studio-ink)]"><ArrowLeft className="h-4 w-4" aria-hidden />Back to the exhibition</Link>
      )}
      <PageHeader title="Email Studio" description="Choose recipients, design the email, then send it through your n8n workflow." />
      {!target.url && <SetupNotice title="Sending is not connected yet">{target.reason} You can still build, preview and save campaigns.</SetupNotice>}
      {target.mode === 'test' && target.url && (
        <SetupNotice title="Test mode">
          Campaigns go to the n8n test workflow and only to the {testAddresses} address{testAddresses === 1 ? '' : 'es'} listed in EMAIL_TEST_RECIPIENTS{testAddresses === 0 ? ' (none set, so test sends are blocked)' : ''}.
        </SetupNotice>
      )}
      {draftError && <SetupNotice title="Draft not opened">{draftError}</SetupNotice>}
      <ClientTabs
        label="Email Studio sections"
        tabs={[
          { key: 'compose', label: 'Compose & send', content: <EmailStudioApp initialDraft={initialDraft} /> },
          { key: 'history', label: 'History & drafts', content: history },
          { key: 'automations', label: 'Automations', content: automations },
        ]}
      />
    </div>
  );
}
