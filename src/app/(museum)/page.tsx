import type { Metadata } from "next";
import Link from "next/link";
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

  // No fabricated works: with nothing published (or no database) the page says so.
  if (paintings.length === 0) {
    return (
      <main className="museum-empty">
        <h1>{ARTIST.name}</h1>
        <p>{error ? "The collection could not be loaded right now. Please try again shortly." : "The collection is being prepared. New works will appear here as they are published."}</p>
        <p>
          <Link href="/contact">Get in touch</Link>
        </p>
      </main>
    );
  }

  return (
    <>
      <a className="skip-link" href="#collection">
        Skip the 3D walkthrough
      </a>
      <main>
        <MuseumLoader paintings={paintings} />
        <ArtworkDetails paintings={paintings} />
        <ArtistSection />
      </main>
    </>
  );
}
