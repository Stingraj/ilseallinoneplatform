'use server';

import { getServiceRoleClient } from '@/lib/supabase-server';
import { hashUnsubscribeToken, isWellFormedUnsubscribeToken } from '@/lib/email/unsubscribe';

export type UnsubscribeState = { status: 'idle' | 'done' | 'invalid' | 'error' };

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Suppresses marketing email for the address behind a token. Idempotent; every contact row with that address is
 * suppressed. Reveals nothing about the contact. Necessary replies to enquiries are not marketing and are unaffected.
 */
export async function unsubscribeAction(_previous: UnsubscribeState, formData: FormData): Promise<UnsubscribeState> {
  const token = formData.get('t');
  if (!isWellFormedUnsubscribeToken(token)) return { status: 'invalid' };
  const { client } = getServiceRoleClient();
  if (!client) return { status: 'error' };

  const { data: row, error } = await client
    .from('marketing_unsubscribe_tokens')
    .select('token_hash, email_normalized')
    .eq('token_hash', hashUnsubscribeToken(token))
    .maybeSingle();
  if (error) return { status: 'error' };
  if (!row) return { status: 'invalid' };

  const now = new Date().toISOString();
  const { error: updateError } = await client
    .from('contacts')
    .update({ consent_marketing: false, unsubscribed_at: now })
    .ilike('email', escapeLike(row.email_normalized))
    .is('unsubscribed_at', null);
  if (updateError) return { status: 'error' };
  await client.from('marketing_unsubscribe_tokens').update({ used_at: now }).eq('token_hash', row.token_hash).is('used_at', null);
  return { status: 'done' };
}
