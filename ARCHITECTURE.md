# Architecture

One Next.js 16 (App Router, React 19) application, one Vercel project, the archive's existing Supabase project, and n8n for email.

```
Browser ──► src/proxy.ts ── refreshes the Supabase session; /studio only for STUDIO_OWNER_EMAILS; /dashboard/* → /studio/*
   │
   ├─ Public site  src/app/(site)/*          ISR (5 min) + on-demand revalidation after every studio change
   │     └─ lib/website/public-artwork-service.ts ── anon key, public views only (website_artworks, …)
   │     └─ forms → server actions → lib/website/enquiries.ts ── service role, validated, rate-limited
   │
   ├─ Viewing room /viewing/[token]          token hashed → service-role lookup → expiry/revoke/passcode checks
   │
   ├─ Studio       src/app/studio/*          owner session client; every action re-checks the owner (getOwnerClient)
   │     ├─ archive / sales / profile        moved from elsa-artist-portfolio, behaviour unchanged
   │     ├─ email                            Email Studio React app → POST /api/studio/email/send → n8n
   │     └─ collectors, enquiries, invoices, exhibitions, viewing-rooms, website, tools, overview (new)
   │
   └─ API          /api/generate-catalog (archive), /api/upload (archive), /api/studio/*, /api/events
                          │
          Supabase Auth · Postgres (RLS, owner = public.studio_owners) · Storage (artwork-images, artist-profile)
          n8n: existing campaign workflow (unchanged) + new automation workflows (one webhook each)
```

## Why this shape

- The archive (Next 14 / React 18) and Email Studio (Vite / React 18) move into one Next 16 app. Archive files were copied with only route paths and the owner check changed; the Email Studio components are unchanged apart from the send URL. Tailwind 3 and the archive's shadcn/ui tokens are kept, so the moved screens render as before.
- ARVISTA was not copied: its repository has no licence. It informed the gallery feel only.
- The old deployments (`elsapfs-main`, `elsa-1780082186337`, Email Studio) keep running until sign-off and are the rollback.

## Service boundaries (blueprint names → code)

| Blueprint | Code |
|---|---|
| artworkRepository | `src/app/actions/db.ts` (preserved archive actions) |
| publicArtworkService | `src/lib/website/public-artwork-service.ts` + `mappers.ts` |
| collectorService | `src/app/studio/collectors/actions.ts`, `src/lib/website/enquiries.ts` |
| exhibitionService | `src/app/studio/exhibitions/actions.ts`, `src/lib/viewing-rooms/*` |
| campaignGateway | `src/lib/email/dispatch.ts`, `src/lib/email/automations.ts`, `/api/studio/email/send` |
| pdfService | `src/lib/pdf-templates.tsx` (archive), `src/lib/invoices/*`, `src/lib/tools/*` (browser-side) |
| analyticsService | `/api/events`, `analytics_events`, Overview queries |

## Security model

- **Auth**: Supabase Auth (existing users). Magic links cannot create accounts (`shouldCreateUser: false`). App layer: `STUDIO_OWNER_EMAILS`. Database layer: `public.studio_owners` + `public.is_studio_owner()` in every RLS policy.
- **Public data**: only through views with explicit column allow-lists (`website_*`). The anon role has no access to the artworks base table or to any new private table.
- **Server-only secrets**: `SUPABASE_SERVICE_ROLE_KEY`, n8n URLs and secret; modules that use them import `server-only`.
- **n8n**: called only from the server; `EMAIL_DISPATCH_MODE` defaults to `disabled`; `test` mode routes everything to a test webhook.
- **Headers**: strict CSP (self + Supabase), `X-Frame-Options: DENY`, `noindex` on `/studio` and `/viewing`.

## Route map

Public: `/`, `/gallery-walk` (3D museum; see docs/GALLERY_WALK.md), `/artworks`, `/artworks/[slug]`, `/collections`, `/collections/[slug]`, `/about`, `/exhibitions`, `/exhibitions/[slug]`, `/contact`, `/viewing/[token]` (noindex), `/sitemap.xml`, `/robots.txt`.

Studio: `/studio` (Overview), `/studio/website`, `/studio/website/profile`, `/studio/archive`, `/studio/archive/new`, `/studio/archive/[id]`, `/studio/archive/catalog`, `/studio/email`, `/studio/collectors`, `/studio/collectors/[id]`, `/studio/enquiries`, `/studio/sales`, `/studio/invoices`, `/studio/exhibitions`, `/studio/exhibitions/[id|new]`, `/studio/viewing-rooms`, `/studio/tools`. Old `/dashboard/*` URLs redirect (308).
