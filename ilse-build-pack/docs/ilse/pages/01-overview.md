# Overview and navigation

Route: `/studio`. Reuse current page, shell, SectionNav, PageHeader and metric component. Primary action: Add artwork. Secondary: View portfolio.

## Visual order

1. Shell header: Ilse Studio, scoped global search, profile menu. No nonfunctional notification bell.
2. Title “Studio overview” with restrained welcome text and actual current date using configured locale/timezone.
3. Four compact metrics: total artworks, available artworks, collectors, open enquiries. Each links to its underlying filtered list. Count all relevant records server-side, not only the current page.
4. Main 8-column area: Recent artworks with real contained thumbnails; Latest enquiries as compact rows. Secondary 4-column area: Upcoming exhibition as the one optional dark card; campaign activity in a light card.
5. Compact quick actions: add artwork, create campaign, add collector, create exhibition, generate catalogue. Use existing routes/form entry points.

Open enquiries means the existing actionable states (`new`, `follow_up`, plus any intentionally mapped state); document the exact definition. Campaigns show draft/queued/workflow accepted/failure according to evidence. Exhibition dates use date-only calendar values without timezone shifts.

Global search covers owner-authorized artwork title/ID, collector name/email and exhibition title. Reuse existing search infrastructure; otherwise add bounded server search with grouped results, debounce and keyboard navigation. It does not search private notes by default. An empty query does not dump contacts. Do not introduce a separate external search service.

On mobile: title/actions, two-by-two metrics, enquiries, upcoming exhibition, recent artworks, campaigns. No tiny desktop sidebar. Bottom tabs and More use the same route registry.

Done when counts match underlying fixture queries, each action opens a working destination, privacy holds, unavailable data is labeled and shell changes do not erase form/editor state elsewhere.
