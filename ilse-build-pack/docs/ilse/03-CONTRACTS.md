# Data and integration contracts

All entities below map to actual existing structures first. New names are proposals, not preapproved migration commands. Keep schema changes minimal, additive and tested against the observed schema. Do not edit historical applied migrations; add a follow-up migration when necessary.

## A. Artwork and publication

Canonical sources: `artworks`, `artwork_images`; public projections already named `website_artworks`, `website_artwork_images`. Preserve IDs, slugs, storage keys, dimensions, prices, currencies and original image bytes. Publication and availability are separate: a sold artwork may be deliberately public; an available artwork may be private.

Public data is allow-listed: title, approved description, medium, year, dimensions, public image, public availability and price only under the existing visibility policy. Never expose notes, cost, insurance, owner/contact data or private location. Avoid `select('*')` from base tables for public output.

Map existing homepage/gallery slots to explicit artwork IDs. Prefer current correct bindings. For incorrect imagery, use a documented mapping of slot → current image → archive ID → approved image. Do not pick arbitrary works or replace genuine artist/profile images. If no approved selection exists, record the unresolved slot; never fabricate an artwork.

Publication must invalidate affected public caches. Test direct URLs, collection/exhibition joins, cached pages and room access. Inspect storage separately: public bucket URLs remain accessible even after a record is unpublished. Decide public derivatives versus signed private originals using current policies; prepare any asset-permission change for review rather than moving production files silently.

## B. Contacts, consent and import

Canonical source is `contacts`, with existing `consent_marketing`, `consent_at`, `unsubscribed_at`, source, tags and interactions. Normalize email by trimming and case normalization for lookup, retaining display data as appropriate. Do not remove `+tags` or dots. Existing duplicates require reviewed merge rules, not an immediate unique index.

CSV pipeline: parse locally or authorized backend → choose field mapping → preview valid/invalid/duplicate rows → choose skip/merge per conflict → server revalidate → transactional or resumable import → summary with row errors. Consent defaults false unless attributable consent evidence accompanies the import. An enquiry or historical sale is not marketing consent. Never overwrite notes or downgrade suppression during merge. Suppression applies across matching normalized email duplicates. Exports must neutralize spreadsheet formula injection and exclude secrets.

Public signup and enquiry endpoints keep their existing abuse controls and server validation. Accept only intended fields; store the enquiry first, then attempt notifications separately. Retry notification without creating another enquiry. New idempotency IDs must be server-validated and bounded.

## C. Email compatibility and durable sending

Existing n8n campaign body must remain:

```json
{"contacts":[{"email":"approved-test@example.com","name":"Test Recipient"}],"subject":"Subject","body":"Compiled email HTML"}
```

This example is illustrative and must never be sent. The inspected schema allows 1–10,000 contacts; that validation cap is not Gmail capacity or permission to send that many. Inspect configured workflow/provider limits; never invent a daily quota. Preserve `EMAIL_DISPATCH_MODE` disabled/test/live and server-only URL/secret resolution.

Required safe dispatch path:

1. Verify owner and validated campaign/draft revision. Resolve selected canonical contacts server-side. Treat client recipient arrays as untrusted and recheck against current canonical eligibility.
2. Reject invalid addresses, suppressed contacts and missing marketing consent for promotional campaigns. Recheck eligibility immediately before recipient dispatch, including queued sends. Show counts/reasons, never silently re-enable contacts.
3. Snapshot approved content/recipient selection for an explicit send confirmation; store the canonical campaign ID/revision. Editing content requires a new revision/confirmation.
4. Atomically claim a unique dispatch operation before contacting n8n. A database uniqueness constraint/transaction is required; a disabled button or in-memory map is insufficient across retries or instances.
5. Track states: draft → queued/scheduled → dispatching → accepted_by_workflow; failed or unknown when appropriate. Per-recipient sent/delivered/bounced requires actual corresponding evidence. The current log can remain as compatibility/audit history.
6. Double-clicks, concurrent requests and duplicate scheduler ticks must return the existing operation. A timeout after sending is **unknown**, not safe to resend automatically. Exactly-once delivery cannot be promised from an HTTP relay alone. Reconcile with n8n or require explicit reviewed recovery.
7. If adding an operation ID/header to n8n, first verify and version support for it. Preserve the existing JSON body unless an explicit coordinated change is approved. Internal dedupe must work even while downstream metadata support is unavailable.
8. Use bounded retries only for cases known not to have dispatched, record failures, avoid private data in logs, redact raw webhook errors. A missing durable claim/log store must block live sending rather than fail open.

Candidate additive storage **only if absent**: campaign drafts (content/template/artwork links/revision), recipient selection or recipient jobs, dispatch operations with unique key and timestamps, suppression/token records if existing fields cannot meet requirements. Use a durable scheduler/queue only if existing scheduling is absent. Browser timers are not scheduling. Store scheduled timestamp with timezone intent, allow cancel before claim, and document cancellation limits once accepted. Do not present scheduling as working until restart/concurrent tick tests pass.

Test mode must enforce a known allowlist or capture-only sink; a “test” label or URL name does not prove recipients are safe. Never use live collector lists for integration tests. Test email requires the approved address and test workflow. Track opens/clicks only if verifiable tracking exists; otherwise omit them.

## D. Unsubscribe and automation

Add public `/unsubscribe` only if absent. Use an opaque random or signed token scoped to marketing unsubscribe; no raw email/contact ID lookup exposed. GET displays a confirmation or harmless status without mutation; POST performs idempotent suppression, records time, and shows neutral success without leaking contact details. Never require login. Avoid token exposure in analytics/referrers and bind verification to purpose. Do not use it as an authentication token.

Unsubscribe must immediately affect future and pending marketing deliveries, including all canonical duplicate records for the same address. Re-subscribe requires a separate explicit consent flow. Distinguish marketing suppression from necessary enquiry responses.

Existing automation hooks are candidates to connect, not evidence of complete workflows. Priorities: enquiry notification, signup welcome, exhibition invitation draft, collection announcement draft, follow-up draft. Do not automatically enable promotional automations. Show configured/not configured/disabled with real evidence. Do not invent a general workflow builder.

## E. Exhibition consistency

Reuse `exhibitions` and `exhibition_artworks`. Existing date fields are `start_date`/`end_date`; do not add synonymous `starts_at` columns without need. Validate real calendar dates and start ≤ end. Separate lifecycle status from publication. If status is absent, derive Upcoming/Active/Completed from dates and keep Draft/Cancelled only if supported by an explicit field; avoid two conflicting sources.

Artworks are foreign-key references, not copied inventory. Enforce unique exhibition/artwork membership and stable ordering using an existing order field or one additive column. Save metadata and the desired complete membership/order atomically; validate ownership/IDs, deduplicate selections and check all errors. Include an optimistic revision/updated_at guard if two tabs could overwrite changes. No blanket delete followed by an unchecked insert.

Catalogue action passes ordered canonical artwork IDs plus exhibition metadata to the existing PDF pipeline. Invitation action creates an email draft from the exhibition and selected artworks; no implicit send. Publication remains explicit, defaults false for new records and cannot reveal unpublished artwork or internal notes. Completed exhibitions preserve history; hard delete is not the default.

## F. Documents, invoices and private rooms

Keep existing PDF engine and invoice totals helper. Catalogue images preserve aspect ratio. Preview/export must handle missing images and failure visibly. Generated invoices preserve stored historical seller/buyer/amount snapshots, existing numbering, currency and status rules. Reports never sum mixed currencies as one amount without a documented conversion source.

Private rooms retain hashed-token, expiry, revocation and passcode behavior. Test document/image URLs as well as HTML access. Limited room access must not expose the rest of the archive. Viewing rooms may intentionally show non-public artworks only through the authorized room flow. No indexable secret routes or caching across tokens.

## G. Migrations and capability handling

Inspect actual schema and applied migration history. Existing additive SQL depends on base archive tables and owner functions. Prepare backup/recovery notes, additive migration, validation queries and a rollback strategy that does not drop populated production tables. Test grants, RLS, views and storage for anonymous, owner, unauthorized authenticated and expired-session identities. Index list/filter/join paths according to actual queries.

Missing relation/column → specific setup state; network/permission failure → error state; a successful empty result → true empty state. Do not convert every error into an empty array or zero metric. Proposed reports/settings capabilities must use this same distinction.
