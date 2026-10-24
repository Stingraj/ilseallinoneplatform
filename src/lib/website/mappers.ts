import type { PublicArtwork, PublicCollection, PublicExhibition, PublicProfile } from './types';

type Row = Record<string, unknown>;

const str = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);
const num = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
    .replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function availabilityOf(row: Row): PublicArtwork['availability'] {
  const value = str(row.availability) ?? str(row.status) ?? 'Available';
  if (value === 'Sold') return 'Sold';
  if (value === 'Reserved' || value === 'On Loan') return 'Reserved';
  return 'Available';
}

/**
 * Maps a row from website_artworks (or, before the Studio migration, the legacy public_artworks view) to the public
 * view model. Only allow-listed fields are copied; anything else on the row is ignored.
 */
export function toPublicArtwork(row: Row): PublicArtwork {
  const id = String(row.id);
  const availability = availabilityOf(row);
  const priceVisible = row.is_price_visible === undefined ? true : Boolean(row.is_price_visible);
  return {
    id,
    slug: str(row.slug) ?? id,
    title: str(row.title) ?? 'Untitled',
    medium: str(row.medium),
    dimensions: str(row.dimensions),
    year: num(row.year),
    availability,
    series: str(row.series),
    category: str(row.category),
    collection: str(row.collection),
    description: str(row.description),
    imageUrl: str(row.image_url),
    isFeatured: Boolean(row.is_featured),
    featuredOrder: num(row.featured_order),
    price: availability === 'Available' && priceVisible ? num(row.price) : null,
    currency: str(row.currency) ?? 'USD',
  };
}

export function toPublicProfile(row: Row | null | undefined): PublicProfile | null {
  if (!row) return null;
  return {
    fullName: str(row.full_name),
    bio: str(row.bio) ?? str(row.biography),
    statement: str(row.statement) ?? str(row.artist_statement),
    location: str(row.location),
    nationality: str(row.nationality),
    instagram: str(row.instagram),
    website: str(row.website) ?? str(row.website_url),
    photoUrl: str(row.profile_photo_url) ?? str(row.photo_url),
  };
}

export function toPublicExhibition(row: Row): PublicExhibition {
  const id = String(row.id);
  return {
    id,
    slug: str(row.slug) ?? id,
    title: str(row.title) ?? 'Exhibition',
    venue: str(row.venue),
    location: str(row.location),
    startDate: str(row.start_date),
    endDate: str(row.end_date),
    description: str(row.description),
    coverImageUrl: str(row.cover_image_url),
    externalUrl: str(row.external_url),
  };
}

/** Collections are the archive's `collection` field, falling back to `series`. */
export function groupCollections(artworks: PublicArtwork[]): PublicCollection[] {
  const groups = new Map<string, PublicCollection>();
  for (const artwork of artworks) {
    const name = artwork.collection ?? artwork.series;
    if (!name) continue;
    const slug = slugify(name);
    const group = groups.get(slug) ?? { slug, name, count: 0, cover: null };
    group.count += 1;
    if (!group.cover && artwork.imageUrl) group.cover = artwork;
    groups.set(slug, group);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);
  } catch {
    return `${currency} ${price.toLocaleString('en-US')}`;
  }
}

export function sortArtworks(artworks: PublicArtwork[]): PublicArtwork[] {
  return [...artworks].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    if (a.isFeatured && b.isFeatured) return (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99);
    return (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title);
  });
}
