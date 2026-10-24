'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServiceRoleClient } from '@/lib/supabase-server';
import { roomCookieName, viewingRoomSecret } from '@/lib/viewing-rooms/server';
import { hashRoomToken, isWellFormedToken, passcodeProof, safeEqual } from '@/lib/viewing-rooms/tokens';

export async function unlockRoom(token: string, _previous: string | null, formData: FormData): Promise<string | null> {
  if (!isWellFormedToken(token)) return 'This link is not valid.';
  const secret = viewingRoomSecret();
  const { client: admin } = getServiceRoleClient();
  if (!secret || !admin) return 'Private viewing is temporarily unavailable.';

  const { data: room } = await admin.from('private_rooms').select('id, passcode').eq('token_hash', hashRoomToken(token)).maybeSingle();
  const entered = String(formData.get('passcode') ?? '');
  if (!room?.passcode || !safeEqual(entered, room.passcode)) return 'That passcode is not correct.';

  (await cookies()).set(roomCookieName(room.id), passcodeProof(room.id, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `/viewing/${token}`,
    maxAge: 60 * 60 * 12,
  });
  redirect(`/viewing/${token}`);
}
