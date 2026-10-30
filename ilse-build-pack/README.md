# ILSE Artist Studio — implementation pack

Prepared 30 October 2026. This is an implementation specification, not a claim that the application has been built or tested during this planning task.

## Start in one instruction

Extract this entire folder **inside the existing repository as `ilse-build-pack/`**. Do not copy these files over existing root documentation. Open Claude Code in the repository and paste the contents of [START_HERE.md](START_HERE.md).

The pack deliberately has its own `CLAUDE.md` and `AGENTS.md`. They are task instructions, not replacements for the repository's existing agent instructions. Claude must explicitly read them through START_HERE. Preserve the repository's generated Next.js agent block. If a permanent root instruction is useful, append a short pointer to this pack; never replace the file.

## Decisions locked for this build

- One artist: Ilse. Existing owner authentication and Supabase remain.
- Existing public portfolio design stays; correct artwork images and data bindings only.
- Archive is the artwork source; existing `contacts` is the collector source.
- Enquiries only for public sales. Keep internal sales history and invoices.
- Existing n8n + Gmail stays. Build consent-safe campaign usability around it.
- Integrate and finish existing modules before adding replacements.
- Latest three supplied images supersede the older Donezo/green/no-glass direction **for the dashboard only**.
- Warm translucent desktop shell; blue reference for table structure; mobile reference for panel hierarchy and navigation. No HR, payroll, banking, or multi-user features from the examples.
- Exhibition Management is the first substantial module to complete, but its existing implementation must be extended.

## What was inspected

GitHub branch `integration/artist-studio`, commit `6b7dd42465954834ada7c0fb8b37726d4c229510`. Package manifest, full path tree, existing architecture/progress/agent documents, navigation, exhibition actions/editor, website manager, email page/dispatch/send route, tools page, owner guard and additive SQL migration were read. This is a targeted source review; no application, database or workflow was run. Local changes on your Mac may be newer. Claude must audit that checkout first.

## Reading map

| File | Purpose |
|---|---|
| [CLAUDE.md](CLAUDE.md), [AGENTS.md](AGENTS.md) | Short execution rules and context budget |
| [00-EVIDENCE.md](docs/ilse/00-EVIDENCE.md) | Existing code, real gaps, uncertainty |
| [01-ARCHITECTURE.md](docs/ilse/01-ARCHITECTURE.md) | Layers, ownership, routes, data flows |
| [02-DESIGN.md](docs/ilse/02-DESIGN.md) | Visual tokens, components, responsive behavior |
| [03-CONTRACTS.md](docs/ilse/03-CONTRACTS.md) | Database, email, publishing and security contracts |
| [04-EXECUTION.md](docs/ilse/04-EXECUTION.md) | Dependency-ordered tasks and gates |
| [05-ACCEPTANCE.md](docs/ilse/05-ACCEPTANCE.md) | Functional, visual, privacy and regression checks |
| [pages/INDEX.md](docs/ilse/pages/INDEX.md) | Page specifications; load only the active module |
| `docs/ilse/roles/` | Bounded role instructions, usable sequentially |
| `docs/ilse/state/` | Evidence, task status and resumption templates |
| `docs/ilse/references/` | Your three original design reference images |

## Meaning of “one shot”

One kickoff prompt runs a phased implementation with checkpoints and self-review. It cannot guarantee a production-ready system without database/workflow access, verified content, or production approval. Claude must finish all independent safe work, identify the exact remaining dependency, and never replace a blocked integration with fake success.
