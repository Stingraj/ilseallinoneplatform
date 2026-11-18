import { createHash, randomBytes } from 'node:crypto';

/**
 * Newsletter confirmation (double opt-in) tokens. Random, single-purpose, stored only as a hash. Same shape as the
 * unsubscribe tokens but a different hash prefix, so a token for one purpose can never be used for the other.
 */
export const CONFIRMATION_DAYS = 7;
export const MAX_SIGNUPS_PER_IP_PER_HOUR = 5;
export const MAX_CONFIRMATIONS_PER_EMAIL_PER_DAY = 3;

export function createConfirmToken(): { token: string; tokenHash: string } {
  const token = randomBytes(24).toString('base64url');
  return { token, tokenHash: hashConfirmToken(token) };
}

export function hashConfirmToken(token: string): string {
  return createHash('sha256').update(`newsletter-confirm:${token}`).digest('hex');
}

export function isWellFormedConfirmToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{32}$/.test(token);
}

export type ConfirmationState = 'pending' | 'confirmed' | 'expired';

export function confirmationState(row: { confirmed_at: string | null; expires_at: string }, now = new Date()): ConfirmationState {
  if (row.confirmed_at) return 'confirmed';
  return new Date(row.expires_at) <= now ? 'expired' : 'pending';
}
