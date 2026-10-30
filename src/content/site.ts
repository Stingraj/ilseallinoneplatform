import { SITE } from "@/lib/site/config";

/**
 * Gallery and artist identity, used by the entrance, painting panels, the collection and the closing section.
 * Everything comes from the site configuration: nothing here describes another artist.
 */
export const SITE_URL = SITE.url;

export const GALLERY = {
  name: "Ilse Murdock",
  subtitle: "Selected Works",
  tagline: "Paintings from the studio archive.",
} as const;

export const ARTIST = {
  name: SITE.artistName,
  attribution: `An artistic collection by ${SITE.artistName}`,
  statement: SITE.description,
} as const;
