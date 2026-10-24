import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** A viewing-room link carries a random token; the database only ever stores its SHA-256 hash. */
export function createRoomToken(): { token: string; tokenHash: string } {
  const token = randomBytes(24).toString('base64url');
  return { token, tokenHash: hashRoomToken(token) };
}

export function hashRoomToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isWellFormedToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{32}$/.test(token);
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Cookie value proving the passcode was entered for this room (HMAC, so it cannot be forged or reused elsewhere). */
export function passcodeProof(roomId: string, secret: string): string {
  return createHmac('sha256', secret).update(`viewing-room:${roomId}`).digest('base64url');
}

export type RoomState = 'open' | 'expired' | 'revoked' | 'inactive';

export function roomState(room: { is_active: boolean | null; revoked_at: string | null; expires_at: string | null }, now = new Date()): RoomState {
  if (room.revoked_at) return 'revoked';
  if (room.is_active === false) return 'inactive';
  if (room.expires_at && new Date(room.expires_at) <= now) return 'expired';
  return 'open';
}
