import { createElement } from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { ArtistCatalogPDF, CatalogTablePDF } from '@/lib/pdf-templates';
import { createClient } from '@/lib/supabase/server';
import { isStudioOwner } from '@/lib/auth/owner';
import { ArtistProfileRow, Artwork, Sale } from '@/lib/types/database';

async function fetchImageAsBase64(url: string) {
  const imgRes = await fetch(url, { cache: 'no-store' });
  if (!imgRes.ok) {
    throw new Error(`Failed to fetch image: ${imgRes.status} ${imgRes.statusText}`);
  }
  const imgBuffer = await imgRes.arrayBuffer();
  const base64 = Buffer.from(imgBuffer).toString('base64');
  const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
  return `data:${contentType};base64,${base64}`;
}

function sortArtworks(artworks: Artwork[], sortOrder: string, artworkIds: string[]) {
  if (sortOrder === 'newest') {
    return [...artworks].sort((left, right) => (right.year || 0) - (left.year || 0));
  }
  if (sortOrder === 'oldest') {
    return [...artworks].sort((left, right) => (left.year || 0) - (right.year || 0));
  }
  if (sortOrder === 'title') {
    return [...artworks].sort((left, right) => left.title.localeCompare(right.title));
  }

  const artworkMap = new Map(artworks.map((artwork) => [artwork.id, artwork]));
  return artworkIds
    .map((id) => artworkMap.get(id))
    .filter((artwork): artwork is Artwork => Boolean(artwork));
}

async function loadArtistProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from('artist_profile')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    return {
      ...data,
      website: data.website ?? data.website_url ?? null,
      bio: data.bio ?? data.biography ?? null,
      statement: data.statement ?? data.artist_statement ?? null,
      profile_photo_url: data.profile_photo_url ?? data.photo_url ?? null,
    } as unknown as ArtistProfileRow;
  }

  const legacy = await supabase
    .from('artist_profiles')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (legacy.error || !legacy.data) {
    return null;
  }

  const record = legacy.data as Record<string, any>;
  return {
    id: record.id,
    full_name: record.name ?? null,
    pronouns: null,
    birth_year: null,
    nationality: null,
    location: null,
    instagram: record.instagram ?? null,
    website: record.website ?? null,
    email: record.email ?? null,
    phone: record.phone ?? null,
    studio_address: record.studio_address ?? record.location ?? null,
    statement: record.statement ?? null,
    bio: record.bio ?? null,
    profile_photo_url: record.profile_image_url ?? null,
    updated_at: record.updated_at,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isStudioOwner(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const artworkIds = Array.isArray(body.artworkIds) ? body.artworkIds : [];
    const sortOrder = typeof body.sortOrder === 'string' ? body.sortOrder : 'custom';
    const layout = body.layout === 'table' ? 'table' : 'artwork-pages';
    // Optional cover text (exhibition catalogues). Plain strings only, bounded.
    const coverTitle = typeof body.coverTitle === 'string' ? body.coverTitle.slice(0, 200) : undefined;
    const coverSubtitle = typeof body.coverSubtitle === 'string' ? body.coverSubtitle.slice(0, 300) : undefined;
    const fileName = typeof body.fileName === 'string' && /^[\w.-]{1,80}$/.test(body.fileName) ? body.fileName : 'available-works';

    if (artworkIds.length === 0) {
      return NextResponse.json({ error: 'artworkIds array is required' }, { status: 400 });
    }

    const [{ data: artworks, error }, { data: sales, error: salesError }, { data: settings, error: settingsError }, profile] = await Promise.all([
      supabase.from('artworks').select('*').in('id', artworkIds),
      supabase.from('sales').select('*').in('artwork_id', artworkIds),
      supabase.from('site_settings').select('show_price_on_pdf').limit(1).maybeSingle(),
      loadArtistProfile(supabase),
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (salesError) {
      return NextResponse.json({ error: salesError.message }, { status: 500 });
    }

    if (settingsError) {
      console.warn('PDF price setting unavailable, defaulting to visible prices:', settingsError.message);
    }

    if (!artworks || artworks.length === 0) {
      return NextResponse.json(
        { error: 'No artworks found matching the provided IDs' },
        { status: 404 }
      );
    }

    const sortedArtworks = sortArtworks(artworks as Artwork[], sortOrder, artworkIds);

    const artworksWithImages = await Promise.all(
      sortedArtworks.map(async (artwork) => {
        if (!artwork.image_url) return artwork;

        try {
          const src = await fetchImageAsBase64(artwork.image_url);
          return { ...artwork, image_url: src };
        } catch (error) {
          console.error(`Failed to convert image for ${artwork.title}:`, error);
          return artwork;
        }
      })
    );

    const PDFTemplate = layout === 'table' ? CatalogTablePDF : ArtistCatalogPDF;
    const pdfDocument = createElement(PDFTemplate, {
      artworks: artworksWithImages,
      sales: (sales ?? []) as Sale[],
      profile,
      showPrice: settings?.show_price_on_pdf ?? true,
      ...(layout === 'table' ? {} : { coverTitle, coverSubtitle }),
    }) as unknown as Parameters<typeof renderToBuffer>[0];

    const pdfBuffer = await renderToBuffer(pdfDocument);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF catalog:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
