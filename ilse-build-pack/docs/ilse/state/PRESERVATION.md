# Preservation matrix

| Feature | Route/source | Decision | After evidence |
|---|---|---|---|
| Owner auth | `/login`, `src/proxy.ts`, `lib/auth/*` | Preserved, unchanged | All `/studio/*` incl. new routes → 307 `/login` without session |
| Archive | `/studio/archive/*`, `src/app/actions/db.ts` | Preserved, unchanged code; new shell styling | Build pass |
| Public portfolio | `src/app/(site)/*` | Preserved | Home renders unchanged; only robots.ts gained `/unsubscribe` |
| Profile | `/studio/website/profile` | Preserved; linked from Settings | Build pass |
| Email editor | `components/email-studio/EmailStudioApp.jsx` | Extended (server drafts, consenting picker, operation key); compiler/editor untouched | Typecheck pass |
| Dispatch | `/api/studio/email/send` | n8n payload `{contacts:[{email,name}],subject,body}` kept; `unsubscribeUrl` added only when `N8N_SUPPORTS_UNSUBSCRIBE_URL=1`; legacy `email_campaign_log` insert kept | Unit + DB tests |
| CRM/enquiries | `/studio/collectors`, `/studio/enquiries` | Preserved | Build pass |
| Exhibitions | `/studio/exhibitions/*` | Completed: atomic ordered save, tabs, catalogue, invitations | DB tests pass |
| PDFs/tools | `/studio/tools`, `lib/pdf-templates.tsx` | Preserved; optional cover title/subtitle (default cover unchanged) | Build pass |
| Sales/invoices | `/studio/sales`, `/studio/invoices` | Preserved | Unit tests pass |
| Viewing rooms | `/studio/viewing-rooms`, `/viewing/[token]` | Preserved | Unit tests pass |
| 3D gallery | `/gallery-walk` | Preserved, unchanged | 200 on prod server |
