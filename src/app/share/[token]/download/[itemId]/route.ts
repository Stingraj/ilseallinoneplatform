import { NextResponse, type NextRequest } from 'next/server';
import { SHARE_BUCKET, SIGNED_URL_SECONDS, artworkImagePath, isShareObjectPath } from '@/lib/shares/paths';
import { loadShare } from '@/lib/shares/server';
import { getServiceRoleClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };

/**
 * Re-checks the link (expiry, revocation, passcode cookie) on every download, records it, then redirects to a
 * signed storage URL that expires after a minute. The storage path is never shown on the page.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string; itemId: string }> }) {
  const { token, itemId } = await params;
  const back = new URL(`/share/${token}`, request.url);
  const share = await loadShare(token);
  if (share.kind !== 'open' || !share.items.some((item) => item.id === itemId)) return NextResponse.redirect(back, { status: 303, headers: noStore });

  const { client: admin } = getServiceRoleClient();
  if (!admin) return NextResponse.redirect(back, { status: 303, headers: noStore });

  const { data: item } = await admin
    .from('file_share_items')
    .select('id, share_id, storage_path, file_name, artworks(image_url)')
    .eq('id', itemId)
    .eq('share_id', share.share.id)
    .maybeSingle();
  if (!item) return NextResponse.redirect(back, { status: 303, headers: noStore });

  let bucket = SHARE_BUCKET;
  let path: string | null = null;
  if (item.storage_path && isShareObjectPath(share.share.id, item.storage_path)) {
    path = item.storage_path;
  } else {
    const artwork = Array.isArray(item.artworks) ? item.artworks[0] : item.artworks;
    path = artworkImagePath(artwork?.image_url, process.env.NEXT_PUBLIC_SUPABASE_URL);
    bucket = 'artwork-images';
  }
  if (!path) return NextResponse.redirect(back, { status: 303, headers: noStore });

  const { data: signed, error } = await admin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_SECONDS, { download: item.file_name });
  if (error || !signed?.signedUrl) return NextResponse.redirect(back, { status: 303, headers: noStore });

  await admin.from('file_share_downloads').insert({ share_id: share.share.id, item_id: item.id }).then(() => undefined, () => undefined);
  return NextResponse.redirect(signed.signedUrl, { status: 302, headers: noStore });
}
