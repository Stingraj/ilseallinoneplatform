import 'server-only';

import type { OwnerClient } from '@/lib/studio/data';
import { isMissingSchema } from '@/lib/studio/data';

export interface OrderedArtwork {
  id: string;
  title: string;
  image_url: string | null;
  status: string;
  year: number | null;
}

/** Exhibition artworks in curated order (falls back to the stored order before the position column exists). */
export async function loadOrderedArtworks(client: OwnerClient, exhibitionId: string): Promise<OrderedArtwork[]> {
  let links = await client.from('exhibition_artworks').select('artwork_id, position, artworks(id, title, image_url, status, year)').eq('exhibition_id', exhibitionId).order('position');
  if (links.error && isMissingSchema(links.error)) {
    links = await client.from('exhibition_artworks').select('artwork_id, artworks(id, title, image_url, status, year)').eq('exhibition_id', exhibitionId) as typeof links;
  }
  return (links.data ?? [])
    .map((link) => (Array.isArray(link.artworks) ? link.artworks[0] : link.artworks) as OrderedArtwork | null)
    .filter((a): a is OrderedArtwork => Boolean(a));
}
