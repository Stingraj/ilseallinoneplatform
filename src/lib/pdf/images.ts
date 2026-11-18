import 'server-only';

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/**
 * Fetches an archive image for a PDF and returns it as a data URI. Only Supabase storage images over https are
 * fetched (never arbitrary hosts), and only JPEG/PNG, which is all @react-pdf can draw. Returns null otherwise.
 */
export async function archiveImageDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || !supabase || parsed.origin !== new URL(supabase).origin || !parsed.pathname.startsWith('/storage/v1/object/')) {
    return null;
  }
  try {
    const response = await fetch(parsed, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    const type = (response.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!response.ok || !['image/jpeg', 'image/png'].includes(type)) return null;
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_IMAGE_BYTES) return null;
    return `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
  } catch {
    return null;
  }
}
