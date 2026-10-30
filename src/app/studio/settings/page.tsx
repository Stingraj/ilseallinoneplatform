import Link from 'next/link';
import { PageHeader } from '@/components/studio/page-header';
import { AUTOMATIONS } from '@/lib/email/automations';
import { parseAllowlist } from '@/lib/email/eligibility';
import { resolveDispatchTarget } from '@/lib/email/dispatch';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { requireOwnerPage } from '@/lib/studio/data';
import { getStudioSettings } from '@/lib/studio/settings';
import { SettingsForm } from './settings-form';

export const dynamic = 'force-dynamic';

type Status = { label: string; tone: 'success' | 'warning' | 'danger' | '' };

const set = (name: string) => Boolean(process.env[name]);

export default async function SettingsPage() {
  const supabase = await requireOwnerPage();
  const { user } = await getOwnerClient();
  const settings = await getStudioSettings(supabase);
  const target = resolveDispatchTarget(process.env);
  const timezones = Intl.supportedValuesOf('timeZone');
  if (!timezones.includes(settings.timezone)) timezones.unshift(settings.timezone);

  // Only variable names and presence are shown. Values are never rendered, and no webhook is called from here.
  const integrations: { name: string; detail: string; status: Status }[] = [
    { name: 'Supabase', detail: 'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY', status: set('NEXT_PUBLIC_SUPABASE_URL') && set('NEXT_PUBLIC_SUPABASE_ANON_KEY') ? (set('SUPABASE_SERVICE_ROLE_KEY') ? { label: 'Connected', tone: 'success' } : { label: 'Service role key missing', tone: 'warning' }) : { label: 'Not configured', tone: 'danger' } },
    { name: 'Studio owners', detail: 'STUDIO_OWNER_EMAILS', status: set('STUDIO_OWNER_EMAILS') ? { label: 'Set', tone: 'success' } : { label: 'Not set (studio locked)', tone: 'danger' } },
    {
      name: 'Email sending (n8n)',
      detail: `EMAIL_DISPATCH_MODE = ${target.mode}`,
      status: target.mode === 'disabled' ? { label: 'Off', tone: '' } : target.url ? { label: 'Configured, not verified', tone: 'warning' } : { label: target.reason ?? 'Incomplete', tone: 'danger' },
    },
    { name: 'Test recipients', detail: 'EMAIL_TEST_RECIPIENTS', status: parseAllowlist(process.env.EMAIL_TEST_RECIPIENTS).length ? { label: `${parseAllowlist(process.env.EMAIL_TEST_RECIPIENTS).length} address(es)`, tone: 'success' } : { label: 'Not set (test sends blocked)', tone: 'warning' } },
    { name: 'Unsubscribe links in n8n', detail: 'N8N_SUPPORTS_UNSUBSCRIBE_URL', status: process.env.N8N_SUPPORTS_UNSUBSCRIBE_URL === '1' ? { label: 'Declared supported', tone: 'success' } : { label: 'Not declared (live sends blocked)', tone: 'warning' } },
    ...Object.values(AUTOMATIONS).map((a) => ({ name: a.label, detail: a.env, status: set(a.env) ? ({ label: 'Configured, not verified', tone: 'warning' } as Status) : ({ label: 'Not set', tone: '' } as Status) })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Account, preferences and the status of connected services." />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="studio-card p-5" aria-labelledby="st-account">
          <h2 id="st-account" className="text-base font-semibold">Account</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div><dt className="studio-label">Signed in as</dt><dd>{user?.email ?? 'Unknown'}</dd></div>
          </dl>
          <p className="mt-4 text-sm text-[color:var(--studio-muted)]">
            The public biography, portrait and contact details are edited in <Link href="/studio/website/profile" className="underline">Artist profile</Link>. Sign out from the account menu.
          </p>
        </section>
        <section className="studio-card p-5" aria-labelledby="st-prefs">
          <h2 id="st-prefs" className="mb-3 text-base font-semibold">Preferences</h2>
          <SettingsForm timezone={settings.timezone} locale={settings.locale} timezones={timezones} canSave={settings.stored} />
        </section>
      </div>
      <section aria-labelledby="st-integrations">
        <h2 id="st-integrations" className="mb-3 text-base font-semibold">Connected services</h2>
        <div className="studio-table-wrap">
          <table className="studio-table">
            <thead><tr><th scope="col">Service</th><th scope="col">Setting</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {integrations.map((i) => (
                <tr key={i.name}>
                  <td className="font-medium">{i.name}</td>
                  <td className="font-mono text-xs">{i.detail}</td>
                  <td><span className={`studio-pill ${i.status.tone ? `studio-pill-${i.status.tone}` : ''}`}>{i.status.label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-[color:var(--studio-muted)]">“Configured, not verified” means the address is set. The studio never calls a webhook just to test it.</p>
      </section>
    </div>
  );
}
