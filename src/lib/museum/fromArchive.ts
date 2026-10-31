import type { Painting } from "@/types/artwork";
import type { PublicArtwork } from "@/lib/website/types";
import { parseDimensions } from "../gallery/dimensions.ts";
import { textureUrl } from "../gallery/texture-url.ts";

/** The corridor gains a bay per painting; this keeps the walk, the shader warm-up and texture memory bounded. */
export const MUSEUM_MAX_WORKS = 40;

/** Describes the painting for screen readers using only what the archive records. */
function altText(artwork: PublicArtwork): string {
  return [artwork.title, artwork.medium, artwork.year].filter(Boolean).join(", ");
}

/**
 * Turns the archive's public artworks into the museum's paintings: featured works first (the archive's own order),
 * only works that have an image, at most MUSEUM_MAX_WORKS.
 *
 * Pixel sizes are not stored in the archive, so `image.width/height` are placeholders until the browser measures the
 * photographs (see measurePaintings). Canvas size comes from the free-text `dimensions` field; when it cannot be
 * read the painting gets no physical size and the museum uses its default hanging height rather than a guessed one.
 */
export function paintingsFromArchive(artworks: readonly PublicArtwork[]): Painting[] {
  return artworks
    .filter((artwork): artwork is PublicArtwork & { imageUrl: string } => Boolean(artwork.imageUrl))
    .slice(0, MUSEUM_MAX_WORKS)
    .map((artwork, index) => {
      const size = parseDimensions(artwork.dimensions);
      return {
        id: artwork.id,
        title: artwork.title,
        image: {
          // Same-origin optimised copies for WebGL (no CORS set-up needed); the original is used on the plain page.
          src: textureUrl(artwork.imageUrl, 2048) ?? artwork.imageUrl,
          srcSmall: textureUrl(artwork.imageUrl, 1080) ?? artwork.imageUrl,
          original: artwork.imageUrl,
          width: 4,
          height: 5,
          alt: altText(artwork),
        },
        medium: artwork.medium ?? undefined,
        creationDate: artwork.year ? String(artwork.year) : undefined,
        dimensions: artwork.dimensions ?? undefined,
        // Portrait by default; measurePaintings swaps the sides for a landscape photograph.
        physicalSize: size.known ? { widthCm: size.shortCm, heightCm: size.longCm } : undefined,
        description: artwork.description ?? undefined,
        order: index + 1,
        availability: artwork.availability,
        href: `/artworks/${artwork.slug}`,
      } satisfies Painting;
    });
}

/** Loads one image to learn its pixel size; resolves to null if it cannot be loaded in time. */
function measure(src: string, timeoutMs = 10000): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const image = new Image();
    const timer = window.setTimeout(() => resolve(null), timeoutMs);
    image.onload = () => {
      window.clearTimeout(timer);
      resolve(image.naturalWidth > 0 ? { width: image.naturalWidth, height: image.naturalHeight } : null);
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    image.src = src;
  });
}

/**
 * Fills in each painting's real proportions (browser only). A photograph that cannot be measured keeps a 4:5 frame
 * and shows the museum's "image unavailable" panel instead of a wrong picture.
 */
export async function measurePaintings(paintings: readonly Painting[], concurrency = 6): Promise<Painting[]> {
  const result = [...paintings];
  let next = 0;
  const worker = async () => {
    while (next < result.length) {
      const index = next++;
      const painting = result[index];
      const size = await measure(painting.image.srcSmall ?? painting.image.src);
      if (!size) continue;
      const landscape = size.width > size.height;
      const physical = painting.physicalSize;
      result[index] = {
        ...painting,
        image: { ...painting.image, width: size.width, height: size.height },
        physicalSize: physical && landscape ? { widthCm: physical.heightCm, heightCm: physical.widthCm } : physical,
      };
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, result.length) }, worker));
  return result;
}
