# Email Studio and unsubscribe

Reuse `EmailStudioApp.jsx`, its components, parser, compiler, storage and current server relay. Do not rewrite the editor in a new library or replace n8n/Gmail.

## Workspace — `/studio/email`

Header “Email Studio”, visible draft/save status and dispatch mode. Use section tabs rather than a new application: Campaigns (if durable history/drafts exist or are completed), Compose, Recipients, Preview & send, Automations. Preserve the current steps if renaming would break behavior. Existing saved local drafts remain recoverable; moving to server drafts must use an explicit non-destructive import, not discard browser storage.

Composer desktop: template/controls on left, preview on right. Mobile: form and Preview toggle; avoid shrinking desktop email into unreadable columns. Keep all existing templates, raw HTML support, undo behavior if present and field mappings. Sanitize rendered previews and isolate email HTML so styles/scripts cannot affect the studio. Use existing email-safe compiler; dashboard CSS is never email CSS.

Add “Insert artwork” through a canonical Archive picker: searchable thumbnail, title, year, availability; selected insertion uses approved outward-facing fields and email-accessible image URLs. Do not embed short-lived private signed URLs that expire before recipients open the email. Private artwork sharing requires deliberate scoped publication/asset handling, not automatic bucket exposure.

Recipients: select canonical contacts/segments, show eligible/excluded/duplicate counts and reasons; link CSV import to canonical contact workflow. Preserve existing paste/import usability but recheck eligibility server-side. No client-only consent enforcement.

Preview & send: subject/preheader if supported, desktop/mobile view, selected recipient count, test capture status, final confirmation. Actions: save draft, permitted test, schedule when truly implemented, send explicitly. If scheduler is absent, implement durable schedule per contract or report infrastructure blocker; never show a working Schedule button backed only by browser timeouts.

Campaign history: title/subject, created/scheduled timestamp, recipients, status, safe retry/detail. Distinguish “Accepted by workflow” from “Sent” and “Delivered”. Current HTTP log is insufficient for per-recipient delivery. No fabricated open/click charts.

## Automation tab

List existing enquiry, welcome, exhibition, collection and follow-up hooks. Show configured/disabled/unknown honestly. Start with connection status and draft-trigger actions; no visual workflow builder. Exhibition/collection/follow-up actions generate drafts unless a verified approved automation explicitly permits sending. Do not toggle production workflow state from tests.

## Public `/unsubscribe` — proposed

Minimal page consistent with public styling: confirm unsubscribe, neutral success/already-processed/invalid-link state. No login, contact directory access, marketing content or exposed contact IDs. Follow token/POST/suppression rules in 03-CONTRACTS. Every marketing email includes a working unsubscribe link; test generated HTML contains it.

Acceptance: templates/compiler/import preserved, archive insertion correct, drafts survive navigation, direct API rejects ineligible recipients, concurrent dispatch deduped, no live email in tests, unsupported tracking absent.
