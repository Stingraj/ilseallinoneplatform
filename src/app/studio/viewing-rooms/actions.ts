'use server';

import { revalidatePath } from 'next/cache';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { SITE } from '@/lib/site/config';
import { isMissingSchema } from '@/lib/studio/data';
import { createRoomToken } from '@/lib/viewing-rooms/tokens';

type Result = { success: boolean; error?: string | null; link?: string };

const linkFor = (token: string) => `${SITE.url}/viewing/${token}`;

export async function createViewingRoomAction(formData: FormData): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };

  const title = String(formData.get('title') ?? '').trim();
  const artworkIds = formData.getAll('artwork_ids').map(String).filter(Boolean);
  if (!title) return { success: false, error: 'Give the room a title.' };
  if (artworkIds.length === 0) return { success: false, error: 'Choose at least one artwork.' };

  const expiresOn = String(formData.get('expires_on') ?? '');
  const passcode = String(formData.get('passcode') ?? '').trim();
  if (passcode && passcode.length < 6) return { success: false, error: 'Use a passcode of at least 6 characters, or leave it empty.' };
  const showPrices = formData.get('show_prices') === 'on';

  const { token, tokenHash } = createRoomToken();
  const { data: room, error: insertError } = await client
    .from('private_rooms')
    .insert({
      title: title.slice(0, 200),
      intro: String(formData.get('intro') ?? '').trim().slice(0, 4000) || null,
      contact_id: (formData.get('contact_id') as string) || null,
      passcode: passcode || null,
      expires_at: expiresOn ? new Date(`${expiresOn}T23:59:59Z`).toISOString() : null,
      is_active: true,
      token_hash: tokenHash,
    })
    .select('id')
    .single();
  if (insertError) {
    return { success: false, error: isMissingSchema(insertError) ? 'Viewing rooms need the Studio database migration.' : insertError.message };
  }

  const { error: linkError } = await client.from('private_room_artworks').insert(
    artworkIds.map((artwork_id) => ({ room_id: room.id, artwork_id, visible_fields: { price: showPrices, dimensions: true, description: true } }))
  );
  if (linkError) return { success: false, error: linkError.message };

  const contactId = formData.get('contact_id') as string;
  if (contactId) {
    await client.from('contact_interactions').insert({ contact_id: contactId, kind: 'viewing_room', summary: `Viewing room created: ${title}` }).then(() => undefined, () => undefined);
  }

  revalidatePath('/studio/viewing-rooms');
  // The full link is shown once. Only its hash is stored, so it cannot be looked up again later.
  return { success: true, link: linkFor(token) };
}

export async function revokeViewingRoomAction(id: string): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };
  const { error: updateError } = await client.from('private_rooms').update({ revoked_at: new Date().toISOString(), is_active: false }).eq('id', id);
  if (updateError) return { success: false, error: updateError.message };
  revalidatePath('/studio/viewing-rooms');
  return { success: true };
}

/** Issues a fresh link; the previous link stops working immediately. Also re-opens a revoked room. */
export async function renewViewingRoomLinkAction(id: string): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };
  const { token, tokenHash } = createRoomToken();
  const { error: updateError } = await client.from('private_rooms').update({ token_hash: tokenHash, revoked_at: null, is_active: true }).eq('id', id);
  if (updateError) return { success: false, error: updateError.message };
  revalidatePath('/studio/viewing-rooms');
  return { success: true, link: linkFor(token) };
}
