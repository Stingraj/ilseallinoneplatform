# Reports, settings and authentication

These dedicated report/settings routes were absent from the inspected tree; recheck before creating.

## Reports — `/studio/reports` proposed

Header “Reports”, date range, Export current report. Tabs: Artworks, Enquiries, Campaigns, Exhibitions, Sales. Start with counts/tables; add charts only for a useful comparison with real underlying rows. Reuse overview aggregations rather than implementing competing metric definitions.

- Artworks: inventory count by existing availability; publication count distinct from availability.
- Enquiries: received over time and current statuses, no invented conversion rate.
- Campaigns: drafts/operations and webhook acceptance/failure; delivery/open/click data only if verified.
- Exhibitions: counts, dates and participation using unique artwork links.
- Sales: actual recorded amounts grouped by currency and status; keep invoice status separate from cash received.

Define timezone, date boundaries and totals. Show “Unavailable” for failed queries and “No records in this period” for true zero. Export exactly the selected data scope with safe CSV formatting and owner authorization. Do not build a data warehouse or add third-party analytics solely for chart aesthetics.

## Settings — `/studio/settings` proposed

Sections: Studio profile (links to existing profile editor), account/session, display preferences if supported, integrations and configuration status. Use simple subnavigation; no employee, team, roles or billing management for a one-user product.

Integration status distinguishes configured, safely verified and failing. Supabase status uses a least-privilege check. n8n status must never POST a campaign merely to test connectivity; use a safe existing health mechanism or mark “Configured, not verified”. Show environment variable **names** and setup guidance only when needed, never values or secrets. Preserve owner settings rather than providing an unsafe self-service privilege editor.

Display settings such as timezone/locale must persist through an existing preference mechanism or a justified small addition. Do not add settings toggles that have no effect. Provide existing logout action with correct session invalidation.

## Login — `/login`

Keep current password/magic-link flow and no-self-signup policy. Restyle only if needed for coherence; preserve callback handling and owner verification. User-friendly errors, pending state, keyboard access and redirect to the originally requested permitted studio route. Reject unsafe external return URLs. Do not treat any authenticated user as owner.

Acceptance: reports reconcile with source data; no credentials displayed; integration checks do not send mail; settings persist where offered; login/logout and unauthorized direct requests tested.
