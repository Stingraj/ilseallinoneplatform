import { Artwork, ArtistProfileRow } from '@/lib/types/database';

export const ARTWORK_STATUS_OPTIONS = [
  'Available',
  'Sold',
  'Private',
  'On Loan',
] as const;

export const RAW_STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  ...ARTWORK_STATUS_OPTIONS.map((status) => ({ label: status, value: status })),
] as const;

export const STATUS_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Available', value: 'Available' },
  { label: 'Sold', value: 'Sold' },
  { label: 'Not For Sale', value: 'not-for-sale' },
] as const;

export const PDF_SORT_OPTIONS = [
  { label: 'By Year (newest first)', value: 'newest' },
  { label: 'By Year (oldest first)', value: 'oldest' },
  { label: 'By Title A-Z', value: 'title' },
  { label: 'Custom (drag to reorder)', value: 'custom' },
] as const;

export const CATALOG_SETTINGS_STORAGE_KEY = 'catalog_settings_v2';
export const DEFAULT_CURRENCY = 'USD';

export type ArtworkStatus = (typeof ARTWORK_STATUS_OPTIONS)[number];
export type CatalogSortOrder = (typeof PDF_SORT_OPTIONS)[number]['value'];
export type StatusTabValue = (typeof STATUS_TABS)[number]['value'];

export interface CatalogSettings {
  sortOrder: CatalogSortOrder;
}

export const DEFAULT_CATALOG_SETTINGS: CatalogSettings = {
  sortOrder: 'custom',
};

export function isArtworkStatus(value: string): value is ArtworkStatus {
  return ARTWORK_STATUS_OPTIONS.includes(value as ArtworkStatus);
}

export function normalizeArtworkStatus(value: string | null | undefined): ArtworkStatus {
  const candidate = value ?? '';
  return isArtworkStatus(candidate) ? candidate : 'Available';
}

export function isNotForSaleArtwork(artwork: Artwork) {
  return ['Private', 'On Loan'].includes(normalizeArtworkStatus(artwork.status));
}

export function matchesStatusTab(artwork: Artwork, tab: StatusTabValue) {
  if (tab === 'all') return true;
  if (tab === 'not-for-sale') return isNotForSaleArtwork(artwork);
  return normalizeArtworkStatus(artwork.status) === tab;
}

export function formatInstagramHandle(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('@') ? trimmed : `@${trimmed.replace(/^@+/, '')}`;
}

export function getProfileDisplayName(profile: Partial<ArtistProfileRow> | null | undefined) {
  return profile?.full_name?.trim() || 'Artist';
}

export function getProfileInitials(profile: Partial<ArtistProfileRow> | null | undefined) {
  const source = getProfileDisplayName(profile);
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'A';
}

export function getDistinctArtworkValues(
  artworks: Artwork[],
  key: 'series' | 'category'
) {
  return Array.from(
    new Set(
      artworks
        .map((artwork) => artwork[key]?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b));
}

export function getYearsDescending(artworks: Artwork[]) {
  return Array.from(
    new Set(
      artworks
        .map((artwork) => artwork.year)
        .filter((year): year is number => typeof year === 'number')
    )
  ).sort((a, b) => b - a);
}

export function getArtworkInventoryNumber(artwork: Partial<Artwork>) {
  return artwork.inventory_number?.trim() || '';
}

export function getArtworkPrice(artwork: Partial<Artwork>) {
  return artwork.sale_price ?? artwork.price ?? null;
}

export function getArtworkCollection(artwork: Partial<Artwork>) {
  return artwork.collection?.trim() || '';
}

export function getMergedArtworkProvenance(artwork: Partial<Artwork>) {
  const values = [
    artwork.provenance?.trim() || '',
    formatExhibitionHistory(artwork.exhibition_history).trim(),
  ].filter(Boolean);

  return Array.from(new Set(values)).join('\n');
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency = DEFAULT_CURRENCY
) {
  if (value === null || value === undefined || value === '') return '';
  const amount = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(amount)) return String(value);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatExhibitionHistory(value: Artwork['exhibition_history']) {
  if (!value) return '';
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  return value;
}

export function splitIntoSentences(text: string | null | undefined) {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function getProfileBioPreview(profile: Partial<ArtistProfileRow> | null | undefined) {
  return splitIntoSentences(profile?.bio).slice(0, 2).join(' ');
}
