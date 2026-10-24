# Ilse Sørensen Murdock · Artist Studio

One app with two sides:

- **Public website** (`/`): a gallery-style site whose works come straight from the artwork archive.
- **Studio** (`/studio`): the artist's private dashboard in seven sections. Overview · Website · Artwork Archive · Email Studio · Collectors & Sales · Exhibitions · PDF & Tools.

Built with Next.js 16, React 19, Tailwind CSS 3, shadcn/ui, Supabase (database, auth, storage) and n8n (email). Hosted on Vercel.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys and STUDIO_OWNER_EMAILS
npm run dev                  # http://localhost:3000
```

Without Supabase settings the public site renders empty states and the studio stays locked.

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (`tests/unit`) |
| `scripts/test-migrations.sh <archive-repo> <psql args>` | Replays archive + Studio migrations and RLS checks on a local Postgres |

## Documents

| File | Contents |
|---|---|
| `docs/AUDIT.md` | Layer 1 audit of the original four projects |
| `docs/GALLERY_WALK.md` | The 3D gallery: design, controls, performance, accessibility, recovery |
| `ARCHITECTURE.md` | System diagram, routes, security model |
| `DESIGN_SYSTEM.md` | Gallery and studio design tokens and components |
| `INTEGRATION_PLAN.md` | What came from where, every change to preserved code, n8n contract |
| `DATABASE_CHANGES.md` | Migrations, rollbacks, what to check on the live database |
| `TEST_RESULTS.md` | What has and has not been tested |
| `DEPLOYMENT_CHECKLIST.md` | Staging → production steps and rollback |
| `MASTER_PROGRESS.md` | Feature status |

## Safety defaults

- `/studio` is limited to the emails in `STUDIO_OWNER_EMAILS` (empty = locked), and the database enforces the same through `public.studio_owners`.
- `EMAIL_DISPATCH_MODE` defaults to `disabled`: nothing reaches n8n until it is set to `test` or `live`.
- The public site reads only allow-listed columns from public views; private archive fields never leave the database.

`legacy/existing-website/index.html` is a copy of the previous single-page site, kept for reference only (it is not served).
