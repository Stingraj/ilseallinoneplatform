import 'server-only';

import { n8nHeaders } from './dispatch';

/**
 * New automations (blueprint §Email): each one is a separate n8n workflow with its own webhook, so the existing
 * campaign workflow is never modified. Nothing is sent unless EMAIL_DISPATCH_MODE is "test" or "live".
 */
export const AUTOMATIONS = {
  enquiry: { label: 'Enquiry notification and follow-up', env: 'N8N_ENQUIRY_WEBHOOK_URL' },
  welcome: { label: 'Newsletter welcome', env: 'N8N_WELCOME_WEBHOOK_URL' },
  exhibition_invite: { label: 'Exhibition invitation', env: 'N8N_EXHIBITION_WEBHOOK_URL' },
  collection_announcement: { label: 'New collection announcement', env: 'N8N_COLLECTION_WEBHOOK_URL' },
  collector_follow_up: { label: 'Collector follow-up', env: 'N8N_FOLLOW_UP_WEBHOOK_URL' },
} as const;

export type AutomationKind = keyof typeof AUTOMATIONS;

export function automationTarget(kind: AutomationKind, env: Record<string, string | undefined> = process.env) {
  const mode = (env.EMAIL_DISPATCH_MODE ?? 'disabled').trim().toLowerCase();
  if (mode === 'live') return { mode: 'live' as const, url: env[AUTOMATIONS[kind].env] ?? null };
  if (mode === 'test') return { mode: 'test' as const, url: env.N8N_TEST_WEBHOOK_URL ?? null };
  return { mode: 'disabled' as const, url: null };
}

/** Fire-and-forget: a failing automation must never break the visitor's form submission. */
export async function notifyAutomation(kind: AutomationKind, payload: Record<string, unknown>): Promise<boolean> {
  const target = automationTarget(kind);
  if (!target.url) return false;
  try {
    const res = await fetch(target.url, {
      method: 'POST',
      headers: n8nHeaders(process.env),
      body: JSON.stringify({ automation: kind, test: target.mode === 'test', sentAt: new Date().toISOString(), ...payload }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch (error) {
    console.error(`Automation "${kind}" failed:`, error instanceof Error ? error.message : error);
    return false;
  }
}
