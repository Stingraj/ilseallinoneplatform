'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { shareCookieName } from '@/lib/shares/server';
import { getServiceRoleClient } from '@/lib/supabase-server';
import { viewingRoomSecret } from '@/lib/viewing-rooms/server';
import { hashRoomToken, isWellFormedToken, safeEqual, scopedProof } from '@/lib/viewing-rooms/tokens';

export async function unlockShare(token: string, _previous: string | null, formData: FormData): Promise<string | null> {
  if (!isWellFormedToken(token)) return 'This link is not valid.';
  const secret = viewingRoomSecret();
  const { client: admin } = getServiceRoleClient();
  if (!secret || !admin) return 'File sharing is temporarily unavailable.';

  const { data: share } = await admin.from('file_shares').select('id, passcode').eq('token_hash', hashRoomToken(token)).maybeSingle();
  const entered = String(formData.get('passcode') ?? '');
  if (!share?.passcode || !safeEqual(entered, share.passcode)) return 'That passcode is not correct.';

  (await cookies()).set(shareCookieName(share.id), scopedProof('file-share', share.id, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `/share/${token}`,
    maxAge: 60 * 60 * 12,
  });
  redirect(`/share/${token}`);
}
