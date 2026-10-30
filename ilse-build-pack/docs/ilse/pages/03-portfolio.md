# Portfolio manager and public pages

## Manager — `/studio/website`

Reuse WebsiteControls and existing actions. Header “Portfolio Website”, Preview site, Artist profile. Small true metrics for published/featured/price-visible records. Table: actual artwork, availability, published toggle, featured flag/order, price visibility and View link. Explicit labels distinguish commercial availability from website publication. A disabled publication capability explains missing setup without simulating success.

Changes write to existing artwork fields, then invalidate the correct public cache. Do not add a drag-and-drop page builder, alternative website theme, parallel collection database or replacement CMS.

## Profile — `/studio/website/profile`

Keep existing profile form/photo upload. Manage only supported name, biography, statement, links and contact fields. Separate private owner contact details from public fields. Never fabricate Ilse's biography. Preserve unknown existing fields on partial updates.

## Public page preservation matrix

| Public surface | Allowed integration work | Preserve |
|---|---|---|
| `/` | Correct explicit hero/featured artwork IDs and images; safe data mapping | Composition, typography, sections, motion, navigation |
| `/artworks` | Published data, correct filters/links and responsive images | Existing gallery rhythm and image presentation |
| `/artworks/[slug]` | Correct public metadata/image; enquiry references canonical ID | Layout, zoom/navigation, artistic styling |
| `/collections`, `/collections/[slug]` | Existing grouping and only permitted artwork projections | Existing collection layout and URLs |
| `/about` | Existing profile content/photo from intended source | Artist's narrative, layout and type |
| `/exhibitions`, `/exhibitions/[slug]` | Explicitly published exhibition data and public artwork joins | Existing page design; no new public release by default |
| `/contact` | Existing working form integration and validation | Layout, labels and content |
| `/gallery-walk` | Preserve existing code; only correct authorized artwork bindings if needed | Existing independent feature and fallback; no rebuild |
| `/viewing/[token]` | Verify authorized selected art and expiry/revocation | Existing private-viewing behavior |
| Sitemap/robots | Reflect only legitimate public URLs; no private/unsubscribe tokens | Existing SEO behavior unless a proven defect requires correction |

Before public edits, compare current `(site)` code, `legacy/existing-website/index.html`, local history and available original reference. Do not assume legacy HTML is automatically the desired source. If the original cannot be identified, leave layout intact and document the ambiguity while completing safe admin work. Restoration must be a targeted reviewed diff, never a force-reset.

Acceptance: same design in baseline screenshots; actual Ilse images with correct aspect ratio; private data absent from HTML/API/cache; enquiry persists with exact artwork ID. No cart or checkout.
