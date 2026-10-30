/**
 * Server-side recipient rules. The browser's list is only a request: every address is checked against the
 * canonical contacts table immediately before dispatch.
 */
export type ExclusionReason =
  | 'invalid_address'
  | 'duplicate'
  | 'not_a_collector'
  | 'no_marketing_consent'
  | 'unsubscribed'
  | 'not_in_test_allowlist';

export interface RequestedRecipient {
  email: string;
  name: string;
}

export interface ContactRow {
  email: string | null;
  name: string | null;
  consent_marketing: boolean | null;
  unsubscribed_at: string | null;
}

export interface Classification {
  eligible: RequestedRecipient[];
  excluded: { email: string; reason: ExclusionReason }[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trim and lower-case for lookups only; dots and +tags are kept because they can be different mailboxes. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function classifyRecipients(
  requested: RequestedRecipient[],
  contacts: ContactRow[],
  options: { testAllowlist?: string[] | null } = {}
): Classification {
  // Several contact rows may share one address: any unsubscribe suppresses all of them; consent on any counts.
  const byEmail = new Map<string, { consent: boolean; unsubscribed: boolean; name: string | null }>();
  for (const row of contacts) {
    if (!row.email) continue;
    const key = normalizeEmail(row.email);
    const current = byEmail.get(key) ?? { consent: false, unsubscribed: false, name: null };
    byEmail.set(key, {
      consent: current.consent || Boolean(row.consent_marketing),
      unsubscribed: current.unsubscribed || Boolean(row.unsubscribed_at),
      name: current.name ?? row.name,
    });
  }
  const allow = options.testAllowlist ? new Set(options.testAllowlist.map(normalizeEmail)) : null;

  const seen = new Set<string>();
  const result: Classification = { eligible: [], excluded: [] };
  for (const recipient of requested) {
    const email = recipient.email.trim();
    const key = normalizeEmail(email);
    if (!EMAIL.test(email)) {
      result.excluded.push({ email, reason: 'invalid_address' });
      continue;
    }
    if (seen.has(key)) {
      result.excluded.push({ email, reason: 'duplicate' });
      continue;
    }
    seen.add(key);
    if (allow) {
      // Test sends go only to addresses the owner listed for testing; consent rules are not the gate here.
      if (allow.has(key)) result.eligible.push({ email, name: recipient.name });
      else result.excluded.push({ email, reason: 'not_in_test_allowlist' });
      continue;
    }
    const contact = byEmail.get(key);
    if (!contact) result.excluded.push({ email, reason: 'not_a_collector' });
    else if (contact.unsubscribed) result.excluded.push({ email, reason: 'unsubscribed' });
    else if (!contact.consent) result.excluded.push({ email, reason: 'no_marketing_consent' });
    else result.eligible.push({ email, name: recipient.name || contact.name || '' });
  }
  return result;
}

export const EXCLUSION_LABELS: Record<ExclusionReason, string> = {
  invalid_address: 'invalid address',
  duplicate: 'duplicate',
  not_a_collector: 'not in Collectors',
  no_marketing_consent: 'no email consent',
  unsubscribed: 'unsubscribed',
  not_in_test_allowlist: 'not a test address',
};

export function summarizeExclusions(excluded: Classification['excluded']): string {
  const counts = new Map<ExclusionReason, number>();
  for (const item of excluded) counts.set(item.reason, (counts.get(item.reason) ?? 0) + 1);
  return [...counts.entries()].map(([reason, count]) => `${count} ${EXCLUSION_LABELS[reason]}`).join(', ');
}

export function parseAllowlist(value: string | undefined): string[] {
  return (value ?? '').split(',').map((v) => v.trim()).filter(Boolean);
}
