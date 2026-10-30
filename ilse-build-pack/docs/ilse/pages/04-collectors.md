# Collectors, profiles and enquiries

## Directory — `/studio/collectors`

Keep existing collector actions/form and `contacts`. Header “Collectors”, Add collector and Import CSV. Secondary tabs: Collectors, Enquiries, Sales, Invoices. Table follows blue-reference structure within the warm theme: name, email, tags/source, marketing eligibility, last interaction and actions. Search/filter by permitted fields; no user-role or department columns.

Import is a staged dialog/page: upload → mapping → duplicate/conflict preview → confirm → results. Reuse the existing email contact parser where compatible, but persist to canonical contacts only after server validation. Duplicate rules and consent are in 03-CONTRACTS. Show imported, merged, skipped and invalid counts with downloadable safe error summary if useful. Export only filtered/selected scope with a clear choice.

## Profile — `/studio/collectors/[id]`

Header: name, contact details, Edit and Prepare email. Main: chronological interactions/enquiries; secondary: tags/interests/source/consent status and relevant artwork/sales links. Existing note form remains. Notes stay private. Email button creates a draft; marketing eligibility remains enforced by backend at dispatch.

Contact preferences display consent source/time and unsubscribe status if known. Never use a generic editable “subscribed” toggle to erase suppression evidence. New contact without email remains usable for non-email records if existing schema supports it.

## Enquiries — `/studio/enquiries`

Filters: new, replied, follow_up, closed, spam using actual current values. Rows: collector, artwork thumbnail/title, message excerpt, date and status. Detail panel shows full message, artwork link and history. Existing status-select action remains with pending/error states. Follow-up creates a draft or existing supported action; no automatic send merely by changing status.

No data: explain empty inbox and link to portfolio preview. Backend unavailable: show error/setup state, not “No enquiries”. Protect private messages from public rendering and logs.

Acceptance: existing records visible; safe import/merge; suppressed contact stays suppressed across duplicates; enquiry linked to artwork/contact; mobile details and status actions usable.
