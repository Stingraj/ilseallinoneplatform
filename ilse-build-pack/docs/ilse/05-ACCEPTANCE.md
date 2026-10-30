# Acceptance and verification

Planning pack status: no runtime checks have been executed by its author. Claude records actual command, environment, result and evidence during implementation. BLOCKED is not PASS.

| Area | Required behavior and negative case |
|---|---|
| Auth | Ilse can sign in/out; anonymous, non-owner and expired sessions cannot read studio data or call mutations directly |
| Preservation | Every old route/tool remains reachable; old dashboard redirects remain; unsaved email/form data is not lost by layout changes |
| Archive | List/filter/edit/upload/export work; failed upload/save retains inputs; invalid MIME/size rejected; original images retained |
| Publication | Correct archive image at each mapped slot; draft/private records stay out of public lists, detail, search and joins; cache refresh checked |
| Public design | Before/after mobile/desktop captures show preserved layout/type/navigation/motion; only intended art bindings differ |
| CRM | Valid CSV maps correctly; malformed/duplicate/conflicting rows reported; merge preserves notes and suppression; enquiry does not opt in |
| Enquiries | Stored once, tied to real artwork; failure is visible; notification failure does not erase persisted enquiry |
| Email | Existing templates/editor/compiler/import still work; direct API cannot bypass consent/suppression; secrets absent from browser |
| Dispatch | Concurrent clicks claim once; retry returns same operation; timeout marked unknown; failed durable state blocks live dispatch; no automatic resend after ambiguous acceptance |
| Test mode | Capture-only or recipient allowlist enforced; no production list used; disabled mode cannot call n8n |
| Unsubscribe | Valid token suppresses idempotently; invalid token leaks no contact info; duplicate emails and already queued marketing honor suppression |
| Scheduling | If implemented: survives process restart; timezone correct; duplicate worker ticks deduped; cancellation and dispatch race handled |
| Exhibitions | Create/edit; real date validation; membership/order atomic under forced insert failure; stale edits detected; publication explicit |
| Exhibition integrations | Catalogue uses same selected IDs/order; invitation creates a reusable draft with correct details; neither action sends/publishes implicitly |
| Documents | Catalogue/invoice exports open and show expected text/images/aspect ratio; compressor/optimizer keep original download available |
| Rooms | Valid, expired, revoked and wrong-passcode paths tested; direct assets obey access policy; no cross-room leakage |
| Reports | Counts reconcile with fixture queries; errors differ from zero; HTTP acceptance not called delivered; currencies separated |
| Mobile | 390/768/1440px, no page overflow; menu scrolls; bottom nav does not cover save; forms usable with keyboard open |
| Accessibility | Focus order/restoration, visible labels/errors, contrast, reduced motion, keyboard reordering and 200% zoom |
| Performance | Paginate collections, avoid eager original-image downloads, lazy-load PDF/3D tools; no new shell load of unrelated heavy modules |

## Minimal meaningful test set

Extend existing unit tests for pure validation, state transitions and totals only where changed. Add integration tests for consent dispatch, authorization, transactional exhibition save and public projection privacy. Use a disposable database or staging fixtures to verify actual SQL behavior, not just mocked successful responses. Browser-smoke the critical journeys below; a build alone does not validate them.

1. Owner → archive artwork → edit → publish selected item → public detail → enquiry → studio inbox/collector.
2. Collector import preview → duplicate/suppressed contact → campaign recipient selection → test preview → capture-only dispatch → honest history.
3. Exhibition → select/reorder art → save/reload → catalogue → invitation draft → preview → no implicit email.
4. Existing invoice/export, image optimizer, PDF tools and private-room access remain usable.
5. Anonymous/non-owner attempts at direct handlers and private asset URLs are denied appropriately.

Use synthetic clearly labeled fixtures only in tests/dev, never business dashboards in production. Record blocked staging checks and exact missing prerequisites. Final report must distinguish implemented code, local checks, staging evidence and production readiness; do not claim “all complete” with hidden setup blockers.
