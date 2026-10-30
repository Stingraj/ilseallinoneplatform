# Evidence and preservation register

Source: [repository snapshot](https://github.com/Stingraj/ilseallinoneplatform/tree/6b7dd42465954834ada7c0fb8b37726d4c229510). Read on 2026-10-30. Branch: `integration/artist-studio`. Runtime checks: **not performed in this planning task**.

The repository's MASTER_PROGRESS.md is dated October 25 and says production readiness is unverified. Treat its test claims as prior reports, not current results. Its architecture already describes one Next.js app, Supabase, and a server relay to n8n.

| Capability | Observed evidence | Decision |
|---|---|---|
| Existing framework | package.json: Next 16.4.2, React 19.3.0, Tailwind 3.4, TypeScript, Radix, Supabase | Keep installed stack and lockfile; no upgrade project |
| Studio navigation | `src/components/studio/sections.ts`; seven sections with nested links | Extend existing registry/shell |
| Archive | `/studio/archive`, `/new`, `/[id]`, `/catalog`; `src/app/actions/db.ts` | Preserve, verify behavior before changing UI |
| Public website | `src/app/(site)` routes; public artwork service; `legacy/existing-website/index.html` | Original visual source is a candidate, not confirmed baseline; compare before restoring |
| Website manager | `/studio/website/page.tsx` reads publication/feature/price controls | Reuse; do not create another CMS |
| Owner guard | `getOwnerClient()` checks session and `isStudioOwner` | Preserve and use on every new mutation |
| Email composer | `/studio/email/page.tsx` embeds EmailStudioApp; component paths include editor, templates, contacts, preview, confirmation | Preserve components/compiler/local drafts; verify browser behavior |
| Email sending | POST `/api/studio/email/send`; dispatch schema + disabled/test/live modes | Extend safety and durable state; preserve n8n payload |
| Collectors/enquiries | Existing pages, actions and interactions in tree; `contacts` extended by SQL | Reuse contacts, inspect implementation before adding CRM functionality |
| Exhibitions | Existing actions/editor select `exhibitions`, `exhibition_artworks` and `artworks` | Complete this module; do not create duplicate tables |
| Sales/invoices | Existing routes, invoice PDF API and totals helper | Preserve offline sales/history/invoices |
| Viewing rooms | Existing builder/actions, token helpers and `/viewing/[token]` | Preserve; verify privacy and asset access |
| PDF/file tools | Tools page mounts PDF maker, compressor, image optimizer and archive exports | Keep all, even without individual sidebar links |
| 3D gallery | `/gallery-walk`, gallery libraries and tests in tree; existing docs describe implementation | Preserve; do not assume earlier “not built” conversation remains current |
| Reports/settings/unsubscribe | No dedicated path found in complete inspected tree | Add only after checking newer local tree |
| Scheduling/tracking | Draft/editor exists; inspected relay forwards request and logs HTTP result | Scheduling, durable campaign lifecycle and delivery callbacks remain unverified |

## Concrete gaps from inspected code

1. `src/app/api/studio/email/send/route.ts` validates payload and owner, then forwards submitted contacts. This handler has no contact-consent lookup, suppression check or durable idempotency claim. UI checks cannot substitute for backend enforcement.
2. A successful webhook response is logged as `succeeded`; this proves endpoint acceptance only, not per-recipient delivery, opens or clicks.
3. `src/app/studio/exhibitions/actions.ts` saves the exhibition, deletes its artwork links, then inserts new links in separate requests. It does not inspect the delete error. A later failure can leave a partial update. Implement an atomic, authorized transaction/RPC and validate IDs before writing.
4. The exhibition editor inspected does not include catalogue/invitation actions or ordering controls. Extend it and its existing form; inspect the schema before adding an order field.
5. The additive migration assumes base tables already exist and adds columns to them. It is not a fresh database bootstrap. Do not run it blindly or regenerate the schema.
6. The additive migration backfills `artworks.is_public` from `status = 'Available'`, while the website manager describes a pre-migration Available **and Featured** fallback. Neither is proof of Ilse's explicit publication intent. Compare actual public records and approve a publication manifest; do not auto-publish all available art.
7. SQL view definitions expose an explicit public field list, but grants, view execution semantics, base-table policies and storage behavior need real verification. Unpublishing a DB row does not revoke a public storage URL.

## Required initial audit output

Populate state/PRESERVATION.md with actual route → component → handler → table/view → storage → test evidence. Distinguish absence from missing credentials. Compare current HEAD and working diff with this snapshot. Preserve uncommitted changes. Capture public desktop/mobile baseline and key old workflows using safe fixtures or staging.

Do not declare WORKING from a filename. CODE_PRESENT means source exists; LOCALLY_VERIFIED means the specified local check passed; STAGING_VERIFIED means the connected workflow was exercised safely. If the original public design cannot be identified confidently, leave its layout intact and record the missing reference while completing the admin work.
