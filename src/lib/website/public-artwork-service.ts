import 'server-only';

import { cache } from 'react';
import { createPublicClient } from '@/lib/supabase/public';
import { groupCollections, sortArtworks, toPublicArtwork, toPublicExhibition, toPublicProfile } from './mappers';
import type { PublicArtwork, PublicCollection, PublicExhibition, PublicProfile } from './types';

/**
 * The single read path from the archive to the public website. Everything goes through public views with explicit
 * column lists, so private archive fields (cost, insurance, notes, locations, consignment) are never selected.
 */

const WEBSITE_ARTWORK_COLUMNS =
  'id, slug, title, medium, dimensions, year, availability, series, category, collection, description, image_url, is_featured, featured_order, price, currency';

// The archive's original public view, used until the Studio migration adds website_artworks.
const LEGACY_ARTWORK_COLUMNS =
  'id, title, medium, dimensions, year, status, series, category, image_url, is_featured, featured_order, price, currency, is_price_visible';

export type ArtworkSource = 'website_artworks' | 'public_artworks' | 'unavailable';

export interface ArtworkResult {
  artworks: PublicArtwork[];
  source: ArtworkSource;
  error: string | null;
}

/** PostgREST reports a missing relation as PGRST205 (schema cache) or Postgres 42P01. */
function isMissingRelation(error: { code?: string; message?: string } | null): boolean {
  return Boolean(error && (error.code === 'PGRST205' || error.code === '42P01' || /does not exist|schema cache/i.test(error.message ?? '')));
}

export const getPublicArtworks = cache(async (): Promise<ArtworkResult> => {
  const supabase = createPublicClient();
  if (!supabase) return { artworks: [], source: 'unavailable', error: 'Supabase is not configured.' };

  const current = await supabase.from('website_artworks').select(WEBSITE_ARTWORK_COLUMNS).limit(500);
  if (!current.error) {
    return { artworks: sortArtworks((current.data ?? []).map(toPublicArtwork)), source: 'website_artworks', error: null };
  }
  if (!isMissingRelation(current.error)) {
    return { artworks: [], source: 'unavailable', error: current.error.message };
  }

  const legacy = await supabase.from('public_artworks').select(LEGACY_ARTWORK_COLUMNS).limit(500);
  if (legacy.error) return { artworks: [], source: 'unavailable', error: legacy.error.message };
  return { artworks: sortArtworks((legacy.data ?? []).map(toPublicArtwork)), source: 'public_artworks', error: null };
});

export async function getFeaturedArtworks(limit = 8): Promise<PublicArtwork[]> {
  const { artworks } = await getPublicArtworks();
  const featured = artworks.filter((artwork) => artwork.isFeatured && artwork.imageUrl);
  return (featured.length ? featured : artworks.filter((artwork) => artwork.imageUrl)).slice(0, limit);
}

export async function getArtworkBySlug(slug: string): Promise<PublicArtwork | null> {
  const { artworks } = await getPublicArtworks();
  return artworks.find((artwork) => artwork.slug === slug || artwork.id === slug) ?? null;
}

export async function getRelatedArtworks(artwork: PublicArtwork, limit = 4): Promise<PublicArtwork[]> {
  const { artworks } = await getPublicArtworks();
  const group = artwork.collection ?? artwork.series;
  const others = artworks.filter((candidate) => candidate.id !== artwork.id && candidate.imageUrl);
  const sameGroup = others.filter((candidate) => group && (candidate.collection ?? candidate.series) === group);
  return [...sameGroup, ...others.filter((candidate) => !sameGroup.includes(candidate))].slice(0, limit);
}

export async function getCollections(): Promise<PublicCollection[]> {
  const { artworks } = await getPublicArtworks();
  return groupCollections(artworks);
}

export const getPublicProfile = cache(async (): Promise<PublicProfile | null> => {
  const supabase = createPublicClient();
  if (!supabase) return null;

  const current = await supabase.from('website_artist_profile').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (!current.error) return toPublicProfile(current.data);
  if (!isMissingRelation(current.error)) return null;

  // Before the migration: read only the public columns of the original table.
  const legacy = await supabase
    .from('artist_profile')
    .select('full_name, bio, biography, statement, artist_statement, location, nationality, instagram, website, profile_photo_url, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return legacy.error ? null : toPublicProfile(legacy.data);
});

export const getPublicExhibitions = cache(async (): Promise<PublicExhibition[]> => {
  const supabase = createPublicClient();
  if (!supabase) return [];
  // Only published exhibitions are shown; before the migration there is no publish flag, so none are shown.
  const { data, error } = await supabase.from('website_exhibitions').select('*').order('start_date', { ascending: false });
  return error ? [] : (data ?? []).map(toPublicExhibition);
});

export async function getExhibitionBySlug(slug: string): Promise<PublicExhibition | null> {
  const exhibitions = await getPublicExhibitions();
  return exhibitions.find((exhibition) => exhibition.slug === slug || exhibition.id === slug) ?? null;
}

export async function getExhibitionArtworks(exhibitionId: string): Promise<PublicArtwork[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('website_exhibition_artworks')
    .select(`exhibition_id, ${WEBSITE_ARTWORK_COLUMNS}`)
    .eq('exhibition_id', exhibitionId);
  return error ? [] : (data ?? []).map(toPublicArtwork);
}

/** Splits upcoming/current from past, by end date (or start date when there is no end). */
export function splitExhibitions(exhibitions: PublicExhibition[], today = new Date().toISOString().slice(0, 10)) {
  const current: PublicExhibition[] = [];
  const past: PublicExhibition[] = [];
  for (const exhibition of exhibitions) {
    const last = exhibition.endDate ?? exhibition.startDate;
    (last && last < today ? past : current).push(exhibition);
  }
  current.sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));
  return { current, past };
}
