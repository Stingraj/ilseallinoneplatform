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
