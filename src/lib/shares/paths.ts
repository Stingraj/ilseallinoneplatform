/** File-share storage rules. Pure, so the path checks are unit tested. */
import { safeFileName } from '../tools/format.ts';

export const SHARE_BUCKET = 'documents';
export const MAX_SHARE_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_SHARE_FILES = 30;
export const SIGNED_URL_SECONDS = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** shares/<share id>/<index>-<safe name>; the index keeps two files with the same name apart. */
export function shareObjectPath(shareId: string, index: number, fileName: string): string {
  if (!UUID.test(shareId)) throw new Error('Invalid share id');
  return `shares/${shareId}/${index}-${safeFileName(fileName).slice(0, 120)}`;
}

/** True only for a path directly inside this share's folder, with no traversal. */
export function isShareObjectPath(shareId: string, path: string): boolean {
  if (!UUID.test(shareId)) return false;
  const prefix = `shares/${shareId}/`;
  if (!path.startsWith(prefix)) return false;
  const rest = path.slice(prefix.length);
  return rest.length > 0 && !rest.includes('/') && !rest.includes('..') && /^[\w.-]+$/.test(rest);
}

/** The storage path inside the public artwork-images bucket, from a public object URL (null for other hosts). */
export function artworkImagePath(url: string | null | undefined, supabaseUrl: string | undefined): string | null {
  if (!url || !supabaseUrl) return null;
  try {
    const parsed = new URL(url);
    if (parsed.origin !== new URL(supabaseUrl).origin) return null;
    const prefix = '/storage/v1/object/public/artwork-images/';
    return parsed.pathname.startsWith(prefix) ? decodeURIComponent(parsed.pathname.slice(prefix.length)) : null;
  } catch {
    return null;
  }
}
