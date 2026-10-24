import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site/config';
import { getCollections, getPublicArtworks, getPublicExhibitions } from '@/lib/website/public-artwork-service';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ artworks }, collections, exhibitions] = await Promise.all([getPublicArtworks(), getCollections(), getPublicExhibitions()]);
  const page = (path: string) => ({ url: `${SITE.url}${path}` });
  return [
    page('/'),
    page('/artworks'),
    page('/collections'),
    page('/exhibitions'),
    page('/gallery-walk'),
    page('/about'),
    page('/contact'),
    ...artworks.map((a) => page(`/artworks/${a.slug}`)),
    ...collections.map((c) => page(`/collections/${c.slug}`)),
    ...exhibitions.map((e) => page(`/exhibitions/${e.slug}`)),
  ];
}
