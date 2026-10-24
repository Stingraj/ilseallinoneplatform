# Design system

Two deliberately different moods sharing one codebase: a quiet, premium **gallery** for visitors and a bright, friendly **studio** for the artist. Tokens live in `tailwind.config.ts` and `src/app/globals.css`.

## Public gallery

Derived from the existing website's identity (off-white paper, near-black ink, one red accent, Inter + serif), raised to an editorial, international-gallery scale. The blueprint's coral/lilac/yellow/mint palette competes with the paintings, so it is used in the studio instead.

| Token | Value | Use |
|---|---|---|
| `paper` | `#F5F2EE` | Page background (from the existing site) |
| `ink` | `#1C1B1A` | Text, buttons, footer |
| `stone` | `#8A857F` | Secondary text, labels |
| `signal` | `#CC0000` | Sold dot, form errors (existing site's red) |
| Mat | `#E9E4DD` | Image placeholders / artwork backgrounds |

Type: **Cormorant Garamond** (display, light weights, italic for artwork titles), **Inter** (UI, body). Classes: `.display-xl` (clamp 48–136px), `.display-lg`, `.eyebrow` (11px, 0.28em tracking, uppercase).

Layout: `.site-container` max 1440px, 20/32/48px gutters. Asymmetric 12-column grids (7 + 4 offset, staggered columns), generous vertical rhythm (96–128px sections). Full-bleed hero artwork on Home; artwork detail splits 8/4 with the work on a mat.

Motion: `Reveal` fades content up once as it enters the viewport; images scale 3% on hover over 1.2s; all motion is removed under `prefers-reduced-motion`. Content is never hidden if JavaScript fails.

Images: Supabase Storage URLs go through `next/image` (responsive `sizes`, AVIF/WebP, lazy below the fold, priority for heroes). Images from any other host (old stock placeholders) show an honest "Image forthcoming" panel instead.

Components: `SiteHeader` (transparent over the hero, solid on scroll, full-screen mobile menu with Escape and focus handling), `SiteFooter` (newsletter with explicit consent), `ArtworkCard`, `AvailabilityLabel`, `ArtworkLightbox` (native `<dialog>`, keyboard accessible), `EnquiryForm` (artwork context, honeypot, timing check, consent), `NewsletterForm`.

## Studio dashboard

Soft neutral base (`studio.base #F7F6FB`), white rounded cards (`.studio-card`, 16px radius), one accent per section. The active section colours the header band, nav chip and empty-state icons through `--section-accent`.

| Section | Accent |
|---|---|
| Overview | lilac `#B9A2FF` |
| Website | coral `#F36C65` |
| Artwork Archive | blue `#5B8DEF` |
| Email Studio | yellow `#F6CE61` |
| Collectors & Sales | mint `#7FD8B0` |
| Exhibitions | peach `#FFB38A` |
| PDF & Tools | lavender `#C9B8F5` |

Type: **Bricolage Grotesque** for headings and numbers, Inter for everything else.

Components: `StudioShell` (fixed sidebar on desktop, sheet drawer on mobile, breadcrumb, global "Add artwork"), `PageHeader`, `MetricCard`, `EmptyState`, `SetupNotice` (shown instead of fake data when something is not connected yet), plus the archive's shadcn/ui set (button, input, dialog, select, switch, table, toast…).

UX rules: important tasks in 1–3 steps; destructive actions confirm; optimistic toggles roll back on failure with a toast; every list has empty, loading and error states; numbers are never invented (a "—" means "not connected yet").

## Accessibility

Skip link, landmarks and `aria-current` on navigation, labelled form fields with inline errors (`aria-invalid`, `aria-describedby`), visible focus rings, 44px touch targets on mobile menu controls, alt text from artwork title and medium, `lang="en"`, colour contrast ≥ 4.5:1 for body text on paper.
