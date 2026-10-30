import { createHash, randomBytes } from 'node:crypto';

/** Random, purpose-specific token. Only its hash is stored; it carries no email address or contact ID. */
export function createUnsubscribeToken(): { token: string; tokenHash: string } {
  const token = randomBytes(24).toString('base64url');
  return { token, tokenHash: hashUnsubscribeToken(token) };
}

export function hashUnsubscribeToken(token: string): string {
  return createHash('sha256').update(`unsubscribe:${token}`).digest('hex');
}

export function isWellFormedUnsubscribeToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{32}$/.test(token);
}

export const UNSUBSCRIBE_PLACEHOLDER = '{{unsubscribe_url}}';

/** Footer appended to campaign HTML when the n8n workflow replaces the placeholder per recipient. */
export function withUnsubscribeFooter(html: string): string {
  if (html.includes(UNSUBSCRIBE_PLACEHOLDER)) return html;
  const footer = `<p style="font-family:Arial,sans-serif;font-size:12px;color:#6b7280;text-align:center;margin:24px 0">` +
    `No longer want these emails? <a href="${UNSUBSCRIBE_PLACEHOLDER}" style="color:#6b7280">Unsubscribe</a>.</p>`;
  return html.includes('</body>') ? html.replace('</body>', `${footer}</body>`) : html + footer;
}

export function bodyFingerprint(subject: string, body: string): string {
  return createHash('sha256').update(`${subject}\n${body}`).digest('hex');
}
