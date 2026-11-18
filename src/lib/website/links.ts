/** Link-in-bio rules, shared by the studio editor and its tests. Pure: no server-only imports. */

export const MAX_LINKS = 30;

export interface LinkInput {
  label: string;
  url: string;
}

export type LinkCheck = { ok: true; value: LinkInput } | { ok: false; error: string };

/**
 * Accepts https:// links and mailto: addresses only (the database enforces the same rule). A bare domain such as
 * "shop.example.com" is upgraded to https; http:// is upgraded too, because the public page is served over https.
 */
export function checkLink(rawLabel: string, rawUrl: string): LinkCheck {
  const label = rawLabel.trim().replace(/\s+/g, ' ');
  if (!label) return { ok: false, error: 'Give the link a label.' };
  if (label.length > 80) return { ok: false, error: 'Keep the label under 80 characters.' };

  let url = rawUrl.trim();
  if (!url) return { ok: false, error: 'Add the web address.' };

  if (/^mailto:/i.test(url)) {
    const address = url.slice(7);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return { ok: false, error: 'That email address does not look right.' };
    return { ok: true, value: { label, url: `mailto:${address}` } };
  }

  if (/^http:\/\//i.test(url)) url = `https://${url.slice(7)}`;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: 'That web address does not look right.' };
  }
  if (parsed.protocol !== 'https:' || !parsed.hostname.includes('.')) {
    return { ok: false, error: 'Use a full web address starting with https://, or an email address.' };
  }
  const value = parsed.toString();
  if (value.length > 500) return { ok: false, error: 'That web address is too long.' };
  return { ok: true, value: { label, url: value } };
}

/** Moves one item up or down and returns the new order of IDs. */
export function moveId(ids: string[], id: string, direction: 'up' | 'down'): string[] {
  const index = ids.indexOf(id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
