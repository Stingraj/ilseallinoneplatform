# Page index and shared page contract

Read the active module only. All routes are existing unless explicitly marked proposed. The author inspected route presence; detailed runtime behavior must be verified in the implementation checkout.

| Spec | Pages |
|---|---|
| [01-overview.md](01-overview.md) | `/studio`, global search, navigation |
| [02-archive.md](02-archive.md) | `/studio/archive`, `/new`, `/[id]`, `/catalog` |
| [03-portfolio.md](03-portfolio.md) | `/studio/website`, `/profile`, existing public pages |
| [04-collectors.md](04-collectors.md) | `/studio/collectors`, `/[id]`, `/studio/enquiries` |
| [05-email.md](05-email.md) | `/studio/email`, proposed history/automation tabs, proposed `/unsubscribe` |
| [06-exhibitions.md](06-exhibitions.md) | `/studio/exhibitions`, `/[id]` including `new`, `/studio/viewing-rooms` |
| [07-documents-sales.md](07-documents-sales.md) | `/studio/tools`, `/studio/sales`, `/studio/invoices` |
| [08-reports-settings.md](08-reports-settings.md) | Proposed `/studio/reports`, `/studio/settings`; existing `/login` |

Every data page has loading, true-empty, filtered-empty, failure, missing-setup and permission behavior. Inputs retain values on recoverable failure; mutations show pending/confirmed/failed status. Lists use server pagination and safe sorting; URL query parameters retain filters and page where sensible. Every icon-only action has an accessible name. Every primary CTA maps to a real existing handler or a fully implemented new one. No dead buttons, decorative counts or fake successful toasts.

When a requested feature already works, preserve it and restyle its surrounding presentation only. Page specs are the desired completion state, not instructions to rewrite an existing page.
