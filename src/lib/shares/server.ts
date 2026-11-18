import 'server-only';

import { cookies } from 'next/headers';
import { getServiceRoleClient } from '@/lib/supabase-server';
import { viewingRoomSecret } from '@/lib/viewing-rooms/server';
import { hashRoomToken, isWellFormedToken, roomState, scopedProof, type RoomState } from '@/lib/viewing-rooms/tokens';

export interface ShareItem {
  id: string;
  fileName: string;
  sizeBytes: number | null;
  isArtwork: boolean;
}

export type ShareResult =
  | { kind: 'not_found' }
  | { kind: 'closed'; state: Exclude<RoomState, 'open'> }
  | { kind: 'passcode'; shareId: string; title: string }
  | { kind: 'open'; share: { id: string; title: string; message: string | null; expiresAt: string | null }; items: ShareItem[] };

export const shareCookieName = (shareId: string) => `fs_${shareId.slice(0, 8)}`;

/** Validates a share link server-side; shares are invisible to the anonymous Supabase role. */
export async function loadShare(token: string): Promise<ShareResult> {
  if (!isWellFormedToken(token)) return { kind: 'not_found' };
  const { client: admin } = getServiceRoleClient();
  if (!admin) return { kind: 'not_found' };

  const { data: share } = await admin
    .from('file_shares')
    .select('id, title, message, passcode, revoked_at, expires_at')
    .eq('token_hash', hashRoomToken(token))
    .maybeSingle();
  if (!share) return { kind: 'not_found' };

  const state = roomState({ is_active: true, revoked_at: share.revoked_at, expires_at: share.expires_at });
  if (state !== 'open') return { kind: 'closed', state };

  if (share.passcode) {
    const secret = viewingRoomSecret();
    const proof = (await cookies()).get(shareCookieName(share.id))?.value;
    if (!secret || proof !== scopedProof('file-share', share.id, secret)) return { kind: 'passcode', shareId: share.id, title: share.title };
  }

  const { data: items } = await admin
    .from('file_share_items')
    .select('id, file_name, size_bytes, artwork_id')
    .eq('share_id', share.id)
    .order('sort_order');

  return {
    kind: 'open',
    share: { id: share.id, title: share.title, message: share.message, expiresAt: share.expires_at },
    items: (items ?? []).map((item) => ({ id: item.id, fileName: item.file_name, sizeBytes: item.size_bytes, isArtwork: Boolean(item.artwork_id) })),
  };
}
