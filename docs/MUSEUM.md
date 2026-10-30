# The museum (`/`)

The home page is the ARVISTA scroll-driven 3D museum, filled from the artwork archive. Visitors stand before the entrance, scroll to open the doors, walk a vaulted corridor and face each painting. Below the walk the same works are listed as ordinary HTML (always rendered, so search engines, screen readers and visitors without WebGL get everything), followed by the artist section with links to the rest of the site.

```
getPublicArtworks()          existing service, public views only
   │
paintingsFromArchive()       src/lib/museum/fromArchive.ts   works with an image, first 40, archive order
   │  serialised → client
MuseumLoader                 measures each photograph, registers the list, then imports the museum
   └─ MuseumExperience       src/components/museum/*          unchanged ARVISTA scene, overlays and timeline
ArtworkDetails / ArtistSection   server-rendered HTML
```

## Where each fact comes from

| On screen | Archive field |
|---|---|
| Title, medium, description | `title`, `medium`, `description` |
| Created | `year` (shown as the year only) |
| Dimensions | `dimensions`, verbatim |
| Hanging size | parsed from `dimensions` (`lib/gallery/dimensions.ts`); if unreadable the museum's default height is used, never a guess |
| Frame proportions | measured from the photograph in the browser |
| Availability, detail link | `availability`, `/artworks/<slug>` (the enquiry form lives there) |

Nothing about the collection is written into the code. Names and wording are in `src/content/site.ts`.

## Limits and behaviour

- **40 works at most** (`MUSEUM_MAX_WORKS`): the corridor gains a bay per work, so this bounds the walk, shader warm-up and texture memory. Featured works come first. Every work stays reachable on `/artworks`.
- **Texture source**: archive images are fetched through the Next.js image optimiser (same origin, resized, no storage CORS set-up). Images that are not archive images (for example a local database) are fetched directly and need CORS.
- **No works / no database**: the page says so honestly; no placeholder paintings are shown.
- **An image that fails to load** shows the museum's own "image unavailable" panel for that painting only.
- **Why a loader**: the museum computes its layout, camera route and scroll timeline from the painting list when its modules are first imported, so the list is registered (`content/paintings.ts`) before they load. Changing the archive takes effect on the next page load.
- Page-level styles are scoped to `.museum-root` (`components/museum/museum-root.css`), so the rest of the website and the studio are unaffected.

## Adding Ilse's photographed works

`node scripts/import-catalog-images.mjs` (run after `supabase/one-shot/ilse-full-setup.sql`) publishes the works from the archive's catalogue staging folder (`elsa-artist-portfolio/public/catalog-imports`). It imports only photographs that are at least 1200 px wide and whose file name exactly matches one catalogue title (15 today; 14 sharp photographs have no catalogue entry and are left out). It crops the plain wall away, resizes to 2400 px and uploads to the `artwork-images` bucket, then creates or updates each work by catalogue number, so re-running never duplicates. Only title, year, medium, dimensions and catalogue number are imported; provenance, exhibitions and locations (which can name private collectors) are not. Imported works have status "Available" (the table default) and no price: review each one in Studio > Artwork Archive. `--dry-run` shows the plan without touching anything.
