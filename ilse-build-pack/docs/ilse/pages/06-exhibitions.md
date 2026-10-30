# Exhibitions and private viewing rooms

Extend existing `exhibition-form.tsx`, actions and pages. This module already exists in the reviewed tree.

## List — `/studio/exhibitions`

Header “Exhibitions”, Create exhibition. Tabs: Exhibitions, Viewing rooms. Search and lifecycle filter; rows/cards include title, venue, start/end date, artwork count, lifecycle and a separate publication badge. Card covers use actual selected artwork if configured. Empty state starts a new draft. Do not invent past exhibitions.

## New/editor — `/studio/exhibitions/new` handled by current `[id]`

Sections: Details (title/description), Venue (venue/location/link), Dates, Artworks, Internal notes if supported, Publication. Preserve current fields. The artwork picker searches canonical inventory, displays selected count and supports order. Use move buttons plus optional drag; warn about unavailable/private works without silently excluding intentionally selected private exhibition inventory. Public projection still excludes private works.

Save draft keeps publication false. Editing a published exhibition shows the existing explicit publication setting, not a new forced reset. Dates validate actual calendar values. Save metadata and ordered membership atomically; preserve inputs on error and reject stale concurrent edits as appropriate.

## Detail — `/studio/exhibitions/[id]`

Use tabs inside existing route rather than duplicate pages: Overview, Artworks, Invitations, Catalogue. Overview shows venue/schedule/lifecycle/publication; Artworks shows ordered selection; Invitations links to real created campaign drafts/status; Catalogue uses the current PDF renderer. Edit can remain inline or use the existing form view.

Primary actions:

1. Edit exhibition → existing form/handler.
2. Generate catalogue → ordered artwork IDs and exhibition title/venue/dates; preview before download; public/private metadata handling explicit.
3. Prepare invitation → existing Email Studio draft with exhibition details and selected artwork; recipient picker uses contacts; no send.
4. Preview public page → only available if the existing publication state permits it; never auto-publish to make preview work.

Store relationships or stable return links so the user can return from Email/PDF to the exhibition. Do not recreate the same draft on repeated clicks if the user intended to reopen it; offer reuse versus explicit new draft.

## Rooms — `/studio/viewing-rooms`

Keep current room builder, selected artwork/collector references, expiry, passcode, revoke and token behavior. Restyle within the same shell. Clearly separate room sharing from public exhibition publishing. Share-link generation is allowed locally; sending the link to a collector requires an explicit user action. Show copied status accurately and avoid leaking full tokens into logs.

Acceptance: round-trip save/order; forced failure leaves previous membership intact; catalogue/order and invitation content match; dates and publication independent; existing rooms and history remain.
