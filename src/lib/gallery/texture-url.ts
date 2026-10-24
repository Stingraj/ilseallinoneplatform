const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;

/** Widths the Next.js image optimiser accepts by default. */
const WIDTHS = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];

export function snapWidth(width: number): number {
  return WIDTHS.find((w) => w >= width) ?? WIDTHS[WIDTHS.length - 1];
}

export function isArchiveImage(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && url.hostname === supabaseHost && url.pathname.startsWith('/storage/v1/object/public/');
  } catch {
    return false;
  }
}

/**
 * Same-origin URL for a WebGL texture. Going through the image optimiser gives resized, compressed images and, being
 * same-origin, needs no CORS configuration on the storage bucket (WebGL refuses cross-origin pixels without it).
 * Development fixtures live under /dev-fixtures and are used as they are.
 */
export function textureUrl(src: string, width: number): string | null {
  if (src.startsWith('/dev-fixtures/')) return src;
  if (!isArchiveImage(src)) return null;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${snapWidth(width)}&q=80`;
}
