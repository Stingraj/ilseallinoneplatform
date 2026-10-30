# Artwork Archive

Existing sources: `src/app/studio/archive/*`, `src/app/actions/db.ts`, existing image/storage and PDF components. Inspect all supported fields before altering forms.

## List — `/studio/archive`

Header “Artwork Archive”, result count, primary Add artwork, secondary Generate PDF. Toolbar: search, existing availability/medium/year/collection filters, sort, grid/list toggle. Preserve existing selections and bulk actions. Desktop table: thumbnail/title, year, medium, dimensions, availability, publication and actions; optional price column respects owner preferences. Artwork grid uses natural proportions within neutral mats; no destructive crop. Pagination and selection counts must distinguish page selection from all matching records.

Bulk publication requires explicit preview/confirmation. Avoid introducing bulk delete. Preserve an existing delete capability behind its current confirmation and relationship checks; do not invoke it on real data during tests.

## Add — `/studio/archive/new`

Two-column form: image upload/preview on left; existing metadata fields on right, then optional details. Retain current validation, supported images, upload progress and record ownership. Check dimensions/size/MIME; preserve original bytes and existing storage keys. Save as unpublished unless current explicit user choice says otherwise. Save → existing edit/detail route with real persisted ID, not a synthetic success card.

## Detail/edit — `/studio/archive/[id]`

Large contained artwork, title/availability/publication chips, existing form fields and save action. Add relationships below only when backed by data: exhibitions, enquiry history, recorded sales, documents/room usage. These navigate to canonical records. Preserve extra images, pricing, dimensions and legacy metadata even if not visually prominent. Failed save keeps values; concurrent changes are detected where possible.

## Catalogue — `/studio/archive/catalog`

Keep existing full-catalogue generator, price visibility switch and existing templates. Selection/order in exhibition exports should call this pipeline or its underlying shared renderer, not a second generator. Preview/progress/download states are explicit. Missing-image handling cannot silently present the wrong artwork.

Acceptance: old filters, new/edit/upload, selection and PDF behaviors survive; no extra inventory table; image fidelity retained; pagination and failed-save behavior checked.
