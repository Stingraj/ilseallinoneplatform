# Studio design specification

## Reference precedence

The latest user supplied three references. They supersede the pasted brief's older green Donezo palette and prohibition on glass effects. This is an admin-only change. Preserve public portfolio typography, navigation, gallery composition and motion.

- **Warm desktop dashboard:** primary visual language. Large softly rounded app frame, peach/stone atmosphere, calm dark typography, translucent sidebar, white panels, one restrained dark feature panel.
- **Blue user-management dashboard:** reference for generous table width, toolbar alignment, subtle dividers, pill statuses, pagination and active navigation. Do not copy sample users, departments, snowflakes or icy branding.
- **Mobile Payrix panels:** reference for readable rounded content surfaces and compact bottom navigation. Keep the same warm palette on mobile; do not create an unrelated cyan banking interface or fake assistant bar.

## Composition by layer

1. Background: static warm gray base with one broad muted peach gradient at upper left. No animated particles, 3D blobs or wallpaper behind every row.
2. App frame: subtle white border, soft shadow, translucent surface, 28px corner radius on large screens. Leave 24–40px exterior space, not the enormous mockup margins. Use full width and remove outer framing below 768px.
3. Sidebar: 224–240px, small Ilse Studio wordmark, grouped labels, 44px links, outline icons, quietly filled active pill. Bottom profile menu uses Ilse's real photo only if available, otherwise initials.
4. Header: breadcrumb where useful, title, one-sentence description, primary action at right. Search can live in the shell; never add redundant searches without distinct scope.
5. Work surface: 20–24px gap; headings and toolbar before data; nearly opaque panels for text/form/table legibility. Glass belongs to the frame, not complex layered form controls.
6. Interaction: hover/focus/pressed states; 120–180ms simple transitions; reduced-motion support. No entrance animations that delay work.

## Proposed implementation tokens

These are authored starting values, not sampled exact colors. Verify contrast on the final composited backgrounds.

| Token | Value | Usage |
|---|---|---|
| canvas | `#E7E3DE` | Base background |
| atmosphere | `#D8B39A` | Restrained peach glow |
| shell | `rgba(250,249,247,.78)` | App frame |
| surface | `rgba(255,255,255,.94)` | Readable work panels |
| surface-solid | `#FAF9F7` | Blur fallback, table/form surfaces |
| ink | `#18212B` | Primary text |
| muted | `#5C646C` | Labels and help text |
| line | `#D6D2CD` | Dividers and input boundaries |
| accent | `#8C4E2B` | Warm active indicator, small highlights |
| action | `#202322` | Primary button / optional feature panel |
| success | `#17613D` on `#E8F3EC` | Published/complete states |
| warning | `#865313` on `#FFF3DC` | Pending/configuration states |
| danger | `#A12D2D` on `#FCECEC` | Failed/destructive states |
| focus | `#2456B8` | Visible keyboard outline |

Namespace tokens beneath `.ilse-studio` or the existing studio root. Do not globally replace `body`, `button`, public font tokens or root CSS variables. Use an existing suitable sans-serif font; avoid a new remote font dependency. Title 28–32px desktop/24–28px mobile; body 14–16px; secondary labels 12–13px; line height about 1.5. Numbers may use tabular numerals. Keep headings restrained.

Spacing scale: 4, 8, 12, 16, 20, 24, 32. Input/button radius 10–12px; cards 18–22px; shell 28px. One subtle shell shadow and very light panel shadows at most. Blur maximum 16px on shell, disabled on constrained mobile/fallback; no nested full-screen backdrop filters.

## Shared components and exact behavior

| Component | Contract |
|---|---|
| PageHeader | One H1, subtitle, primary/secondary actions; actions wrap below title on mobile |
| SectionNav | Single navigation registry; active parent plus active tab; keyboard accessible |
| DataTable | Real column headers, 56–64px artwork/contact rows, visible actions, sticky header only within explicit scroll region |
| FilterBar | Search, filters, result count, clear action; URL parameters persist sort/filter/page where appropriate |
| StatusPill | Text plus color; distinguish Unpublished, Published, Available and Sold |
| ArtworkTile | Whole artwork contained in neutral mat; title/year/status; click opens existing editor |
| FormSection | Label, help/error text, clear required markers; save feedback and unsaved-change protection |
| EmptyState | What is empty and one valid next action; no demo business records |
| ErrorState | Explain failure, preserve form values, retry; distinguish connection failure from zero records |
| SetupNotice | Disabled capability with concise reason; no credential values or raw provider errors |

Primary buttons use charcoal, white text and an optional small icon. Secondary buttons use a light surface with a border. Destructive actions go in explicit menus/dialogs, never next to routine save without separation.

## Responsive rules

- ≥1280px: sidebar and header, 12-column content grid; overview main area 8 columns and secondary 4. Forms max readable width about 960px; tables may use full available width.
- 1024–1279px: sidebar 216px; secondary cards wrap below if main content would become cramped.
- 768–1023px: compact navigation or drawer; two-column simple grids; no concealed actions.
- <768px: one column, 16px padding, accessible top menu, bottom tabs Overview/Archive/Email/More. More contains every other destination. Bottom navigation reserves space and device safe area; drawers scroll independently and restore document scroll on close.
- Tables: prefer mobile row cards showing main identity/status/action; if a complex table needs horizontal scrolling, contain it and label the region. Never make the whole page overflow.
- Dialogs become sheets on narrow screens with visible close/save controls. Maintain focus trap, Escape close and focus restoration. Touch actions at least 44×44px.
- Check at 390, 768 and 1440px plus 200% text zoom. Long titles, emails, translated-like text expansion and empty data must fit.

## Accessibility and visual completion

Target WCAG AA contrast, including translucent states. Keyboard access for menus, tabs, filters, reordering and pickers. Ordering must have Move up/down controls even if dragging is offered. Respect reduced motion and preserve browser scroll behavior. No missing focus rings for aesthetics.

Capture before/after desktop and mobile screenshots from the app. Compare reference proportions, frame, sidebar, table rhythm and control density. Do not treat screenshot fidelity as permission to lower contrast or copy unrelated content. Public pages must show no unintended visual change beyond corrected artwork imagery.
