# Master progress

Branch: `integration/artist-studio` · Last updated: 2026-10-25

Status key: **Preserved** (existing, moved without behaviour change) · **Integrated** (existing, now connected to the platform) · **New** (built here) · **Tested** (automated or manual checks passed, see TEST_RESULTS.md) · **Prod-ready** · **Blocked** (waiting on something outside this repo)

No feature is marked Prod-ready yet: nothing has run against the real Supabase project or a hosted n8n.

## Layers

| Layer | Status | Notes |
|---|---|---|
| 1 Audit | Done | `docs/AUDIT.md` |
| 2 Architecture | Done | `ARCHITECTURE.md` |
| 3 Design | Done | `DESIGN_SYSTEM.md` |
| 4 Preservation | Done (local) | Integration branch; old deployments untouched; rollback SQL; migration tests |
| 5 Integration | Done (code) | Archive and Email Studio moved into `/studio` |
| 6 Website | Done (code) | Public site reads archive data through public views |
| 7 Dashboard | Done (code) | Seven sections |
| 8 New tools | Done (code) | CRM, enquiries, invoices, exhibitions, viewing rooms, PDF tools, analytics |
| 9 Testing | Partial | Unit + migration/RLS tests pass; end-to-end against staging is **Blocked** (no Supabase/n8n access yet) |
| 10 Production | Not started | Needs approval; see `DEPLOYMENT_CHECKLIST.md` |

## Features

| Feature | Section | Status |
|---|---|---|
| Owner-only sign-in (password + magic link, no self sign-up) | Auth | New · Tested (unit) · Blocked: live verify |
| Artwork list, PDF generator, add/edit/delete, image upload | Artwork Archive | Preserved · Blocked: live verify |
| Complete catalogue PDF, PDF price switch | Archive / PDF & Tools | Preserved · Blocked: live verify |
| Sales tracker | Collectors & Sales | Preserved · Blocked: live verify |
| Artist profile + photo upload | Website | Preserved · Blocked: live verify |
| Email Studio composer, templates, contact import | Email Studio | Preserved |
| Email Studio send → n8n (same payload, server relay, test/live switch) | Email Studio | Integrated · Tested (unit) · Blocked: hosted n8n |
| Automations: enquiry, welcome, exhibition, collection, follow-up | Email Studio | New (webhook hooks) · Blocked: n8n workflows to be created |
| Public site: Home, Works, Artwork, Collections, About, Exhibitions, Contact | Public | New · Tested (build + local render, no data) · Blocked: real data |
| Private viewing rooms (hashed links, expiry, revoke, passcode, access log) | Exhibitions | New · Tested (unit + RLS) · Blocked: migration |
| Website publishing controls (on website / featured / price) | Website | New + Preserved actions · Blocked: migration for publish toggle |
| Collectors CRM (profiles, interests, tags, consent, history) | Collectors & Sales | New · Blocked: migration |
| Enquiries inbox (from website forms, rate-limited, spam-guarded) | Collectors & Sales | New · Tested (unit) · Blocked: migration |
| Invoices from sales + PDF | Collectors & Sales | New · Tested (unit totals/numbering) · Blocked: migration |
| Exhibitions (create, dates, artworks, cover, publish) | Exhibitions | New · Blocked: migration for publish |
| PDF maker, PDF compressor, image optimiser (in-browser) | PDF & Tools | New · Tested (build) · manual browser test pending |
| Overview KPIs (real data only, time filter) | Overview | New · Blocked: migration for enquiries/views/campaigns |
| Anonymous analytics (no cookies, DNT respected) | Overview | New · Blocked: migration |
| Security fixes S1–S5 (RLS, buckets) | Database | New · Tested (local Postgres) · Blocked: staging apply |
| 3D Gallery Walk (`/gallery-walk`): original multi-room museum from archive data, guided + free movement, collision, spotlights, inspect view, 2D fallback, WebGL recovery | Public | New · Tested (unit + browser, local fixtures) · Blocked: real archive images and non-Chrome browsers; see docs/GALLERY_WALK.md |
| Link in bio (`/links`, edited in Website → Link in bio) | Public / Website | New (quick wins) · Tested (unit + SQL + build + HTTP smoke) · Blocked: migration |
| Newsletter double opt-in (`/confirm-subscription`, pending count in Email Studio, rate limits) | Email Studio | New (quick wins) · Tested (unit + build + HTTP smoke) · Blocked: migration, n8n confirmation workflow |
| Certificates of authenticity (PDF with QR, public `/verify/<code>`, withdraw) | Artwork Archive | New (quick wins) · Tested (unit + SQL + build) · Blocked: migration, browser check of the PDF |
| Quotes → invoice, paid date + sale sync, receipts, payment reminders (manual + daily cron) | Collectors & Sales | New (quick wins) · Tested (unit + SQL + build) · Blocked: migration, n8n reminder workflow, `CRON_SECRET` |
| Secure file sharing (`/share/<token>`: expiry, passcode, withdraw, download log, signed URLs) | PDF & Tools | New (quick wins) · Tested (unit + SQL + build + HTTP smoke) · Blocked: migration, browser upload test |
| ARVISTA code | Public | Not used (no licence); creative reference only |
| Journal | Public | Not built: no real editorial content yet (blueprint marks it optional) |

## Blockers

Quick wins (branch `build/quick-wins`, 2026-11-18): apply `supabase/migrations/20261118000000_studio_quick_wins.sql` after the earlier three; create the n8n workflows for `N8N_CONFIRM_WEBHOOK_URL` and `N8N_PAYMENT_REMINDER_WEBHOOK_URL`; set `CRON_SECRET` on Vercel. Not yet browser-tested against a local Supabase (Docker was not running).


1. Supabase project `qdqsmciqnntvzpyhqbps` access (for staging branch, schema check, migrations).
2. Hosted n8n URL, existing workflow list, a test webhook.
3. Content confirmation: biography, public pricing policy, domain.
4. Owner email(s) for `STUDIO_OWNER_EMAILS`.
