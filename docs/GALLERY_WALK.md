# Gallery Walk (`/gallery-walk`)

An original 3D museum built from the artwork archive. Rooms, walls, lighting and every label are generated at run time from Supabase data: nothing about the collection is hard-coded. ARVISTA was a creative reference only; no code, layout or assets were taken from it.

## How it fits together

```
getPublicArtworks()  (existing service, public views only)
        │
planGallery()        src/lib/gallery/plan.ts      pure: groups, rooms, wall layout, camera stops
        │  serialisable plan → client
GalleryWalk          capability check → 3D or 2D
   ├─ Walkthrough    input, HUD, story cards, info panel, recovery      (client, lazy-loaded)
   │    └─ Scene     react-three-fiber canvas: rooms, artworks, lights  (client, lazy-loaded)
   └─ RoomGrid       the same rooms as an ordinary page (2D fallback)
```

Archive edits already revalidate the whole site, so a new or edited artwork appears in the gallery on the next request; `revalidate = 300` is only a safety net.

## The twelve layers

| # | Layer | Where | How |
|---|---|---|---|
| 1 | Architecture | `lib/gallery/plan.ts`, `themes.ts`, `components/gallery3d/Room.tsx`, `materials.ts` | A foyer, then a corridor and an exhibition room per collection. Five architectural identities (nero, limestone, walnut, sage, concrete) with their own proportions, wall and floor materials, ceilings (coffers, skylight, track lights) and colour. Materials are painted on canvases at run time (seamless noise, planks, marble, terrazzo): nothing downloaded. |
| 2 | Camera | `lib/gallery/navigation.ts`, `route.ts` | Guided tour between stops along doorway-aligned, corner-rounded routes; smoothstep speed (gentle start and stop); heading eases from the previous view, along the direction of travel, onto the next picture. Free exploration is optional (`F`). |
| 3 | Artwork data | `plan.ts`, `lib/website/public-artwork-service.ts` | Title, medium, year, dimensions, description, availability and price come from the archive's public views. Physical size is parsed from the `dimensions` text (`parseDimensions`); hanging proportions come from the photograph itself. |
| 4 | Exhibition rooms | `groupArtworks()` | One room per collection (or series). Groups of fewer than 3 share a "Further Works" room; groups over 8 split into evenly sized rooms ("Coast · I", "· II"). |
| 5 | Interactions | `Artwork.tsx`, `Walkthrough.tsx`, `InspectOverlay.tsx` | Click or tap a work to walk to it; an information panel shows details, enquiry and page links; "Inspect" opens a full-resolution zoom/pan view (wheel, pinch, buttons, arrow keys). |
| 6 | Lighting | `Lighting.tsx` | A fixed pool of spotlights follows the nearest works (no shader recompiles), two of them casting soft shadows on high-tier devices; per-theme exposure so paintings are never burnt out; a procedural studio environment for reflections on polished floors, brass and frames; room-by-room fog and ambient colour that blend across doorways; drifting dust. |
| 7 | Movement | `navigation.ts`, `walkable.ts` | Eased guided motion, momentum in free mode, circle-vs-walkable-area collision with sliding along walls, doorway-only passage between rooms. |
| 8 | Storytelling | `Walkthrough.tsx` | Each room opens with a title card (room number, collection name, work count, a line describing its architecture), cinematic bars while travelling, wall plaques beside every work, and the artist's name in the foyer. |
| 9 | Performance | `texture-cache.ts`, `Scene.tsx`, `tier.ts` | See below. |
| 10 | Accessibility | `Walkthrough.tsx`, `describe.ts`, `RoomLists.tsx` | See below. |
| 11 | Mobile | `Walkthrough.tsx`, `Scene.tsx` | Swipe or tap Next to walk, tap a work to approach, compact information sheet, taller field of view and a lifted view in portrait, no free-walk on phones. |
| 12 | Testing | `tests/unit/gallery.test.mts` + browser checks | See `TEST_RESULTS.md`. |

## Controls

| Input | Action |
|---|---|
| Scroll, → ↓ PageDown, Next | Walk to the next work or room |
| ← ↑ PageUp, Previous | Walk back |
| Click / tap a work | Approach it |
| I, Enter | Inspect the work (zoom, pan) |
| M | Jump to a room |
| F | Explore freely / return to the tour |
| W A S D, Q E, Shift | Walk, turn, run while exploring (drag to look) |
| Esc | Close a panel |
| Swipe up/down (touch) | Next / previous |

## Performance

- **Lazy loading**: three.js and the scene are a separate chunk, downloaded only on devices that will use it. Only rooms within two regions of the visitor are mounted, so a large archive costs the same as a small one.
- **Textures**: archive photographs are fetched through the Next image optimiser (same-origin, resized, WebP/AVIF; also avoids CORS problems with WebGL). A reference-counted cache loads at most 3 at a time, keeps a texture 6 s after its last user leaves, then disposes it. A larger version replaces the small one only while the visitor is in front of the work.
- **Lights**: 8 spotlights (6 on medium devices) regardless of archive size; shadows only on high tier.
- **Pixel ratio**: capped at 1.75 (high) / 1.25.
- **Soak test**: five full trips between the first and last room left GPU texture, geometry and shader counts flat (29 / 68 / 16) at 60 fps.
- **Tiers** (`tier.ts`): no WebGL, data-saver, ≤2 GB memory or ≤2 cores → 2D gallery by default, with a "Walk the 3D gallery" button.

## Accessibility

- Every control is a real button or link with a name; the page header and footer beneath the gallery are made inert while it is open.
- Full keyboard operation (see Controls); focus returns correctly from the inspector (a native `<dialog>`).
- An `aria-live` region announces each stop ("Coast, work 3 of 7: …"); a text-only list of every work, by room, is available to screen readers while the canvas is showing.
- `prefers-reduced-motion`: no camera travel (instant jumps), no breathing, bobbing, dust, letterbox bars or fade-ins.
- "2D gallery" is one button away at all times and is also the default when 3D is unsuitable or fails. It is the same rooms as a normal page and works without JavaScript (`<noscript>`).

## WebGL recovery

`webglcontextlost` is caught (and `preventDefault`ed so the browser may restore the context). The visitor sees "Restoring the gallery…"; on `webglcontextrestored` the scene is rebuilt in place (new materials, empty texture cache), keeping the current stop. If the context is not restored within 6 s, or is lost 3 times in 2 minutes, the visitor is moved to the 2D gallery with an explanation.

## Testing without the archive

```bash
node scripts/make-gallery-fixtures.mjs          # 24 abstract JPEGs in public/dev-fixtures (git-ignored)
GALLERY_FIXTURE=1 npm run dev                   # 18 stand-in works in 4 collections
```

A red notice on the 2D page and the fixture images identify the data as stand-ins. The flag is ignored on Vercel production.

## Known limits

See "Remaining issues" in `TEST_RESULTS.md`.
