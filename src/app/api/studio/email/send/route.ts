import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { n8nHeaders, resolveDispatchTarget } from '@/lib/email/dispatch';
import { classifyRecipients, parseAllowlist, summarizeExclusions, type ContactRow } from '@/lib/email/eligibility';
import { bodyFingerprint, createUnsubscribeToken, withUnsubscribeFooter } from '@/lib/email/unsubscribe';
import { isMissingSchema } from '@/lib/studio/data';
import { SITE } from '@/lib/site/config';

/**
 * Owner-only campaign relay to n8n. Server-side it re-checks every recipient against Collectors (consent,
 * unsubscribes, duplicates; in test mode the test allowlist), claims a unique dispatch operation before contacting
 * n8n so retries and double clicks cannot send twice, and records the outcome honestly: a 2xx from n8n means the
 * workflow accepted the campaign, not that anything was delivered. The n8n body keeps its shape:
 * { contacts: [{ email, name }], subject, body } (+ unsubscribeUrl per contact once the workflow supports it).
 */
const requestSchema = z.object({
  contacts: z.array(z.object({ email: z.string().max(320), name: z.string().max(200).default('') })).min(1).max(10_000),
  subject: z.string().trim().min(1).max(300),
  body: z.string().min(1).max(2_000_000),
  operationKey: z.string().uuid(),
  draftId: z.string().uuid().optional(),
});

const fail = (message: string, status: number, extra: Record<string, unknown> = {}) => NextResponse.json({ message, ...extra }, { status });

async function loadContacts(client: NonNullable<Awaited<ReturnType<typeof getOwnerClient>>['client']>) {
  const rows: ContactRow[] = [];
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await client
      .from('contacts')
      .select('email, name, consent_marketing, unsubscribed_at')
      .not('email', 'is', null)
      .range(from, from + 999);
    if (error) return { rows: null, error };
    rows.push(...((data ?? []) as ContactRow[]));
    if (!data || data.length < 1000) break;
  }
  return { rows, error: null };
}

export async function POST(request: NextRequest) {
  const { client, error: authError } = await getOwnerClient();
  if (!client) return fail(authError ?? 'Not allowed.', 401);

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('The campaign is incomplete. Check the subject, content and recipients, then confirm again.', 400);
  const { contacts, subject, body, operationKey, draftId } = parsed.data;

  const target = resolveDispatchTarget(process.env);
  if (!target.url) return fail(target.reason ?? 'Sending is not configured.', 503);

  const unsubscribeSupported = process.env.N8N_SUPPORTS_UNSUBSCRIBE_URL === '1';
  if (target.mode === 'live' && !unsubscribeSupported) {
    return fail(
      'Live campaigns need a working unsubscribe link in every email. Update the n8n workflow to replace {{unsubscribe_url}} with each contact\'s unsubscribeUrl, then set N8N_SUPPORTS_UNSUBSCRIBE_URL=1.',
      503
    );
  }

  let allowlist: string[] | null = null;
  if (target.mode === 'test') {
    allowlist = parseAllowlist(process.env.EMAIL_TEST_RECIPIENTS);
    if (allowlist.length === 0) return fail('Test mode needs EMAIL_TEST_RECIPIENTS: the only addresses test sends may go to.', 503);
  }

  // Canonical eligibility, checked now rather than trusted from the browser.
  const { rows, error: contactsError } = await loadContacts(client);
  if (!rows) {
    return fail(
      isMissingSchema(contactsError) ? 'Email consent fields are missing: apply the Studio database migrations before sending.' : 'Collectors could not be checked, so nothing was sent.',
      503
    );
  }
  const { eligible, excluded } = classifyRecipients(contacts, rows, { testAllowlist: allowlist });
  const exclusionNote = excluded.length ? ` ${excluded.length} not included (${summarizeExclusions(excluded)}).` : '';
  if (eligible.length === 0) return fail(`No recipient may receive this campaign.${exclusionNote}`, 400, { excluded: excluded.length });

  const outgoingBody = unsubscribeSupported ? withUnsubscribeFooter(body) : body;
  const fingerprint = bodyFingerprint(subject, body);

  // Durable claim. The unique operation_key means a second request with the same confirmation never re-sends.
  const claim = await client
    .from('email_dispatch_operations')
    .insert({
      operation_key: operationKey,
      draft_id: draftId ?? null,
      subject,
      body_sha256: fingerprint,
      dispatch_mode: target.mode,
      requested_count: contacts.length,
      eligible_count: eligible.length,
      excluded_count: excluded.length,
      state: 'dispatching',
    })
    .select('id')
    .single();

  if (claim.error) {
    if (claim.error.code === '23505') {
      const { data: existing } = await client
        .from('email_dispatch_operations')
        .select('id, state, body_sha256, eligible_count')
        .eq('operation_key', operationKey)
        .maybeSingle();
      if (existing && existing.body_sha256 !== fingerprint) {
        return fail('This confirmation belongs to different content. Review the campaign and confirm again.', 409);
      }
      const label = existing?.state === 'accepted_by_workflow' ? 'was already accepted by the workflow' : existing?.state === 'dispatching' ? 'is already being sent' : `previously ended as "${existing?.state}"`;
      return NextResponse.json(
        { message: `Not sent again: this campaign ${label}. Start a new confirmation only if you are sure it did not go out.`, operation: existing, duplicate: true },
        { status: 200 }
      );
    }
    return fail(
      isMissingSchema(claim.error) ? 'Sending history is not set up: apply the Studio database migrations. Nothing was sent.' : 'The send could not be recorded, so nothing was sent.',
      503
    );
  }
  const operationId = claim.data.id as string;
  const finish = (state: 'accepted_by_workflow' | 'failed' | 'unknown', http_status: number | null, error: string | null) =>
    client.from('email_dispatch_operations').update({ state, http_status, error, updated_at: new Date().toISOString() }).eq('id', operationId);

  // Per-recipient unsubscribe links (only meaningful once the workflow inserts them into each email).
  let outgoingContacts: { email: string; name: string; unsubscribeUrl?: string }[] = eligible;
  if (unsubscribeSupported) {
    const tokens = eligible.map((recipient) => ({ recipient, ...createUnsubscribeToken() }));
    const { error: tokenError } = await client.from('marketing_unsubscribe_tokens').insert(
      tokens.map((t) => ({ token_hash: t.tokenHash, email_normalized: t.recipient.email.trim().toLowerCase(), operation_id: operationId }))
    );
    if (tokenError) {
      await finish('failed', null, 'Unsubscribe links could not be prepared');
      return fail('Unsubscribe links could not be prepared, so nothing was sent.', 503);
    }
    outgoingContacts = tokens.map((t) => ({ ...t.recipient, unsubscribeUrl: `${SITE.url}/unsubscribe?t=${t.token}` }));
  }

  let status = 0;
  let text = '';
  let outcome: 'accepted_by_workflow' | 'failed' | 'unknown';
  try {
    const res = await fetch(target.url, {
      method: 'POST',
      headers: n8nHeaders(process.env),
      body: JSON.stringify({ contacts: outgoingContacts, subject, body: outgoingBody }),
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });
    status = res.status;
    text = (await res.text()).slice(0, 300);
    outcome = res.ok ? 'accepted_by_workflow' : 'failed';
  } catch (error) {
    // Refused connections never reached n8n; a timeout or reset may have, so its result is unknown.
    const code = (error as { cause?: { code?: string } })?.cause?.code;
    outcome = code === 'ECONNREFUSED' || code === 'ENOTFOUND' ? 'failed' : 'unknown';
    text = code ?? (error instanceof Error ? error.name : 'network error');
  }
  await finish(outcome, status || null, outcome === 'accepted_by_workflow' ? null : text || null);

  // Compatibility log used by the overview before dispatch operations existed.
  await client
    .from('email_campaign_log')
    .insert({ subject, recipient_count: eligible.length, dispatch_mode: target.mode, http_status: status || null, succeeded: outcome === 'accepted_by_workflow' })
    .then(() => undefined, () => undefined);

  const prefix = target.mode === 'test' ? '[Test workflow] ' : '';
  if (outcome === 'accepted_by_workflow') {
    return NextResponse.json({
      message: `${prefix}Accepted by the n8n workflow for ${eligible.length} recipient${eligible.length === 1 ? '' : 's'}.${exclusionNote} This confirms the workflow received it, not that emails were delivered.`,
      operation: { id: operationId, state: outcome },
    });
  }
  if (outcome === 'unknown') {
    return fail(
      `${prefix}No clear answer from n8n (${text}). The campaign may or may not have been sent; check n8n before trying again. It will not be resent automatically.`,
      504,
      { operation: { id: operationId, state: outcome } }
    );
  }
  return fail(`${prefix}n8n did not accept the campaign${status ? ` (HTTP ${status})` : ''}. Nothing was confirmed as sent.`, 502, {
    operation: { id: operationId, state: outcome },
  });
}
