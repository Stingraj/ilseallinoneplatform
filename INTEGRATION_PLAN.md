# Integration plan

Approved 2026-10-25: one Next 16 app here; fix S1–S9 on staging first; work from fresh GitHub clones; ARVISTA as inspiration only.

## Sources

| Source | Origin | How it came in |
|---|---|---|
| Artwork archive | `Stingraj/elsa-artist-portfolio` @ `dec981b` | Files copied into `src/app/studio/{archive,sales,website/profile}`, `src/app/actions/db.ts`, `src/app/api/{generate-catalog,upload}`, `src/lib/*`, `src/components/{archive,auth,ui}` |
| Email Studio | `Stingraj/email-campaign-studio` @ `71e5ef6` | `src/components/email-studio/*` (unchanged JSX), mounted at `/studio/email` |
| Existing website | Vercel deployment `elsa-1780082186337` (no Git source) | `legacy/existing-website/index.html` kept for reference; identity, palette and copy carried into the new public site |
| ARVISTA | `chiragvaze/Arvista` (no licence) | Not copied. Inspiration only |

## Changes made to preserved code (and why)

| File | Change | Reason |
|---|---|---|
| Archive pages, `db.ts`, sidebar links | `/dashboard/...` → `/studio/...` | New route structure (old URLs redirect) |
| `db.ts` | Dashboard client = owner check (`getOwnerClient`) | S1 |
| `db.ts` | `submitInquiryAction` removed | S6: replaced by validated, rate-limited `submitEnquiry` |
| `db.ts` | `revalidatePath('/')` → whole-site revalidation | Website updates after every archive change |
| `profile/actions.ts`, `api/upload`, `api/generate-catalog` | Added owner check | S1 |
| `login/page.tsx` | `shouldCreateUser: false`; magic link lands on `/auth/callback`; error messages | S1 |
| `middleware.ts` | Replaced by `src/proxy.ts` (Next 16), validates the session with `getUser()` | S8 |
| `api/generate-catalog` | `Buffer` wrapped in `Uint8Array` | Next 16 response typing |
| `supabase-server.ts` | `import 'server-only'` | Keeps the service key out of client bundles |
| Archive `prebuild` storage script | Not carried over | S5: it re-forced every bucket public on each build |
| Email Studio `App.jsx` → `EmailStudioApp.jsx` | Sends to `/api/studio/email/send`; webhook URL field replaced by an explanation; root container fits the dashboard | S9: webhook and secret stay on the server; payload unchanged |

Everything else in those files is byte-for-byte from the source repos. Their pre-existing lint findings are reported as warnings (see `eslint.config.mjs`) rather than fixed in place.

## n8n contract

- **Existing campaign workflow**: `POST N8N_CAMPAIGN_WEBHOOK_URL`, JSON `{ contacts: [{ email, name }], subject, body }`, plus header `X-Studio-Secret` when `N8N_WEBHOOK_SECRET` is set. Not modified.
- **New automations** (create as new workflows, do not edit the existing one): JSON `{ automation, test, sentAt, ...data }`
  - `enquiry` → `{ name, email, message, artwork, sourcePage }`
  - `welcome` → `{ email }`
  - `exhibition_invite`, `collection_announcement`, `collector_follow_up` → hooks ready in `src/lib/email/automations.ts`; UI triggers to be added once the workflows exist.
- `EMAIL_DISPATCH_MODE`: `disabled` (default) · `test` (all traffic to `N8N_TEST_WEBHOOK_URL`) · `live`.
- Unsubscribe: consent and `unsubscribed_at` are stored on `contacts`; the campaign workflow should filter on `consent_marketing = true and unsubscribed_at is null` when it pulls from Supabase. A signed unsubscribe link route is a follow-up once n8n's sending setup is known.

## Cut-over (after staging sign-off)

1. Apply both migrations to production (with backup), seed `studio_owners`.
2. Deploy this app to production on Vercel; point the domain.
3. Keep old deployments for 2 weeks, then a final migration removes public read on `artist_profile` and narrows `public_artworks` (both kept only for the old site).
