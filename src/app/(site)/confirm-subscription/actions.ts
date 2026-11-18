'use server';

import { getServiceRoleClient } from '@/lib/supabase-server';
import { notifyAutomation } from '@/lib/email/automations';
import { confirmationState, hashConfirmToken, isWellFormedConfirmToken } from '@/lib/email/confirm';
import { escapeLike } from '@/lib/website/enquiries';

export type ConfirmState = { status: 'idle' | 'done' | 'expired' | 'invalid' | 'error' };

/**
 * Confirms a newsletter sign-up (double opt-in). Idempotent. Gives every contact row with the address marketing
 * consent, or creates the contact, records the confirmation in the collector's history and sends the welcome email.
 */
export async function confirmSubscriptionAction(_previous: ConfirmState, formData: FormData): Promise<ConfirmState> {
  const token = formData.get('t');
  if (!isWellFormedConfirmToken(token)) return { status: 'invalid' };
  const { client } = getServiceRoleClient();
  if (!client) return { status: 'error' };

  const { data: row, error } = await client
    .from('newsletter_confirmations')
    .select('token_hash, email_normalized, expires_at, confirmed_at')
    .eq('token_hash', hashConfirmToken(token))
    .maybeSingle();
  if (error) return { status: 'error' };
  if (!row) return { status: 'invalid' };
  const state = confirmationState(row);
  if (state === 'confirmed') return { status: 'done' };
  if (state === 'expired') return { status: 'expired' };

  const now = new Date().toISOString();
  const email = row.email_normalized;
  const { data: existing, error: findError } = await client.from('contacts').select('id').ilike('email', escapeLike(email));
  if (findError) return { status: 'error' };

  let contactIds = (existing ?? []).map((contact) => contact.id as string);
  const isNew = contactIds.length === 0;
  if (isNew) {
    const { data: created, error: createError } = await client
      .from('contacts')
      .insert({ name: email.split('@')[0], email, type: 'lead', source: 'newsletter', consent_marketing: true, consent_at: now })
      .select('id')
      .single();
    if (createError) return { status: 'error' };
    contactIds = [created.id];
  } else {
    const { error: updateError } = await client
      .from('contacts')
      .update({ consent_marketing: true, consent_at: now, unsubscribed_at: null })
      .in('id', contactIds);
    if (updateError) return { status: 'error' };
  }

  // Mark confirmed only once; a second click (or a second tab) does not repeat the welcome email.
  const { data: claimed } = await client
    .from('newsletter_confirmations')
    .update({ confirmed_at: now })
    .eq('token_hash', row.token_hash)
    .is('confirmed_at', null)
    .select('token_hash');
  if (!claimed?.length) return { status: 'done' };

  await client
    .from('contact_interactions')
    .insert(contactIds.map((contact_id) => ({ contact_id, kind: 'note', summary: 'Confirmed the newsletter sign-up from the confirmation email (double opt-in).' })))
    .then(() => undefined, () => undefined);
  await client.from('analytics_events').insert({ event: 'newsletter_signup' }).then(() => undefined, () => undefined);
  if (isNew) await notifyAutomation('welcome', { email });
  return { status: 'done' };
}
