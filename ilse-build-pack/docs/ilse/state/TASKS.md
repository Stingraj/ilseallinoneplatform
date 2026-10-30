# Execution task board

States: PENDING, IN_PROGRESS, VERIFIED_REUSE, DONE, BLOCKED. DONE = code complete with the local evidence named; staging UI checks are listed in STATUS blockers.

| ID | Task | State | Evidence |
|---|---|---|---|
| T00 | Local HEAD/diff/rules and baseline checks | DONE | HEAD 6b7dd42 clean; AGENTS.md read; Next 16 docs consulted |
| T01 | Preservation matrix and public visual baseline | DONE | PRESERVATION.md; public pages untouched except robots (+`/unsubscribe`) |
| T02 | Schema/contracts/capability inventory | DONE | `20261030000000_studio_workflows.sql` + rollback + `supabase/tests/20_workflow_checks.sql` pass |
| T03 | Scoped studio tokens, shell, navigation, mobile | DONE | `.studio` tokens in globals.css; single nav registry `sections.ts`; sidebar + 3-tab bottom bar + More sheet; build pass. Browser view BLOCKED (auth) |
| T04 | Archive preservation and restyling | VERIFIED_REUSE | Archive files unchanged; inherits shell tokens; build pass |
| T05 | Portfolio exact image-slot bindings / correct imagery | BLOCKED | Needs Supabase archive access to identify the correct records |
| T06 | CRM import/merge/preferences and enquiries | VERIFIED_REUSE (import/merge PENDING) | Existing collectors/enquiries reused; consent read server-side in T08 |
| T07 | Email editor retention, drafts | DONE | EmailStudioApp kept; server drafts (`/api/studio/email/drafts`, revision guard), consenting-collector picker |
| T08 | Server consent/suppression and unsubscribe | DONE | `lib/email/eligibility.ts` (unit tests); `/unsubscribe` hashed tokens, GET non-mutating, POST suppresses all rows of the address |
| T09 | Durable dispatch claim/history, safe test mode | DONE (scheduling gap) | Unique `operation_key`; replay returns stored result, body change → 409; states dispatching/accepted_by_workflow/failed/unknown; test mode requires allowlist |
| T10 | Exhibition atomic save/order and detail | DONE | `save_exhibition` RPC (transaction, stale-edit guard, ordered positions), DB tests pass; detail tabs |
| T11 | Exhibition catalogue and invitation drafts | DONE | Catalogue via existing `/api/generate-catalog` (custom order, cover title); invitation → Email Studio draft, public works only |
| T12 | Viewing rooms, sales/invoices, file tools | VERIFIED_REUSE | Unchanged; existing unit tests pass; build pass |
| T13 | Reports and settings | DONE | `/studio/reports` (5 tabs, range, per-currency totals, "Unavailable" vs 0, CSV with formula neutralising); `/studio/settings` (timezone/locale in `studio_settings`, env names only, n8n "Configured, not verified") |
| T14 | Overview real metrics, search, navigation | DONE | Overview counts link to lists; `/studio/search` bounded grouped search; all nav targets exist (build route list) |
| T15 | Regression and package gates | DONE (UI BLOCKED) | See STATUS gates |
| T16 | Evidence, migration/config notes, handoff | DONE | STATUS.md, `.env.example` |
