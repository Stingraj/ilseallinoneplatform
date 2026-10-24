import 'server-only';

import { cookies } from 'next/headers';
import { getServiceRoleClient } from '@/lib/supabase-server';
import { formatPrice } from '@/lib/website/mappers';
import { hashRoomToken, isWellFormedToken, passcodeProof, roomState, type RoomState } from './tokens';

export interface RoomArtwork {
  id: string;
  title: string;
  medium: string | null;
  dimensions: string | null;
  year: number | null;
  description: string | null;
  imageUrl: string | null;
  price: string | null;
  status: string;
}

export type RoomResult =
  | { kind: 'not_found' }
  | { kind: 'closed'; state: Exclude<RoomState, 'open'> }
  | { kind: 'passcode'; roomId: string; title: string }
  | { kind: 'open'; room: { id: string; title: string; intro: string | null; expiresAt: string | null }; artworks: RoomArtwork[] };

export const roomCookieName = (roomId: string) => `vr_${roomId.slice(0, 8)}`;

export function viewingRoomSecret(): string | null {
  return process.env.VIEWING_ROOM_SECRET ?? null;
}

/** Validates a link token server-side. Rooms are invisible to the anonymous Supabase role. */
export async function loadViewingRoom(token: string): Promise<RoomResult> {
  if (!isWellFormedToken(token)) return { kind: 'not_found' };
  const { client: admin } = getServiceRoleClient();
  if (!admin) return { kind: 'not_found' };

  const { data: room } = await admin
    .from('private_rooms')
    .select('id, title, intro, description, passcode, is_active, revoked_at, expires_at')
    .eq('token_hash', hashRoomToken(token))
    .maybeSingle();
  if (!room) return { kind: 'not_found' };

  const state = roomState(room);
  if (state !== 'open') return { kind: 'closed', state };

  if (room.passcode) {
    const secret = viewingRoomSecret();
    const proof = (await cookies()).get(roomCookieName(room.id))?.value;
    if (!secret || proof !== passcodeProof(room.id, secret)) return { kind: 'passcode', roomId: room.id, title: room.title };
  }

  const { data: links } = await admin
    .from('private_room_artworks')
    .select('visible_fields, artworks(id, title, medium, dimensions, year, description, image_url, price, currency, status)')
    .eq('room_id', room.id);

  const artworks: RoomArtwork[] = (links ?? []).flatMap((link) => {
    const artwork = Array.isArray(link.artworks) ? link.artworks[0] : link.artworks;
    if (!artwork) return [];
    const visible = (link.visible_fields ?? {}) as Record<string, boolean>;
    const price = visible.price !== false && artwork.price !== null && artwork.status === 'Available'
      ? formatPrice(Number(artwork.price), artwork.currency ?? 'USD')
      : null;
    return [{
      id: artwork.id,
      title: artwork.title,
      medium: artwork.medium,
      dimensions: visible.dimensions === false ? null : artwork.dimensions,
      year: artwork.year,
      description: visible.description === false ? null : artwork.description,
      imageUrl: artwork.image_url,
      price,
      status: artwork.status,
    }];
  });

  await admin.from('viewing_room_access_log').insert({ room_id: room.id }).then(() => undefined, () => undefined);

  return {
    kind: 'open',
    room: { id: room.id, title: room.title, intro: room.intro ?? room.description ?? null, expiresAt: room.expires_at },
    artworks,
  };
}
