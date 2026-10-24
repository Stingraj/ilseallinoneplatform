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
| ARVISTA 3D gallery | Public | Not used (no licence); design inspiration only |
| Journal | Public | Not built: no real editorial content yet (blueprint marks it optional) |

## Blockers

1. Supabase project `qdqsmciqnntvzpyhqbps` access (for staging branch, schema check, migrations).
2. Hosted n8n URL, existing workflow list, a test webhook.
3. Content confirmation: biography, public pricing policy, domain.
4. Owner email(s) for `STUDIO_OWNER_EMAILS`.
