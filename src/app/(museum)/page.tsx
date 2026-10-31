import type { Metadata } from "next";
import { MuseumLoader } from "@/components/museum/MuseumLoader";
import { ArtworkDetails } from "@/components/gallery/ArtworkDetails";
import { ArtistSection } from "@/components/gallery/ArtistSection";
import { ARTIST, GALLERY } from "@/content/site";
import { paintingsFromArchive } from "@/lib/museum/fromArchive";
import { getPublicArtworks } from "@/lib/website/public-artwork-service";

// Regenerated whenever the archive changes (studio actions revalidate the site); this is a safety net.
export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: `${ARTIST.name} · ${GALLERY.subtitle}` },
  description: ARTIST.statement,
  alternates: { canonical: "/" },
};

export default async function Home() {
  const { artworks, error } = await getPublicArtworks();
  const paintings = paintingsFromArchive(artworks);

  return (
    <>
      <a className="skip-link" href="#collection">
        Skip the 3D walkthrough
      </a>
      <main>
        <MuseumLoader paintings={paintings} />
        <ArtworkDetails
          paintings={paintings}
          emptyMessage={error ? "The collection could not be loaded right now. Please try again shortly." : "No works have been published yet. New paintings appear here, and in the museum above, as soon as they are published."}
        />
        <ArtistSection />
      </main>
    </>
  );
}
