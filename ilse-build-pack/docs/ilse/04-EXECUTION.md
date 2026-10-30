# Continuous execution plan

One kickoff; incremental implementation. Use existing test scripts and installed docs. Do not install an orchestration framework or create a fresh app.

| Stage | Tasks | Depends on | Completion evidence |
|---|---|---|---|
| 0 Preserve | Record HEAD/diff; read local rules; identify public baseline; map modules; run available baseline checks | None | Preservation matrix, baseline screenshots/results; no user changes lost |
| 1 Contracts | Confirm table/field/route mappings; resolve schema drift; plan small additive changes and test fixtures | 0 | Actual schema map or explicit access blocker; route ownership settled |
| 2 Shell | Scope tokens, adapt existing shell/nav/header/table states and mobile drawer/bottom tabs | 0–1 | Existing routes still usable; public CSS unchanged; responsive captures |
| 3 Reconnect | Archive, publishing, CRM, existing email editor and all PDF/file/sales/room tools | 2 | Existing workflows exercised; artwork/collector pickers reuse canonical data |
| 4 Email correctness | Consent/suppression, unsubscribe, durable dispatch claim/history, safe test mode; scheduling only if missing | 1, 3 | No bypass via direct API; double-click/retry/timeout tests; no live mail |
| 5 Exhibitions | Extend current editor, atomic ordered membership, detail tabs, catalogue and invitation draft actions | 1, 3–4 | End-to-end fixture workflow; no duplicate artwork records or accidental publication |
| 6 Remaining pages | Reports, settings, real overview widgets/search; existing automation hook controls | 3–5 | Every action has a real result or truthful setup state |
| 7 Regression | Run project gates, targeted DB tests, critical journeys, visual/mobile/accessibility checks | All local stages | Actual outcomes, evidence paths, no fabricated pass status |
| 8 Handoff | Document completed/blocked tasks, exact config and migration needs, deployment diff/rollback | 7 | Reviewable implementation with production untouched |

## Per-task loop

1. Read the task row and corresponding page spec; find current code with `rg`.
2. Decide PRESERVE, ADAPT, COMPLETE or BUILD_ABSENT and write one line of evidence.
3. Define the acceptance check before editing. Reuse current service boundaries.
4. Implement a vertical slice: UI → validation → mutation/query → error/empty states → verification.
5. Inspect diff for unrelated changes and broken old behavior. Run affected checks.
6. Update state with exact results and next unblocked task. Keep progress communication brief.

## Economy of context

- Keep root rules short; page specs hold detail. Do not paste the entire original brief into every role.
- Inventory once, then reread only changed modules or unresolved evidence.
- Use bounded searches; never print `.env` values, lockfiles, all generated files or huge logs.
- Read the three references once for shell design, then use captured app screenshots for focused verification.
- Reuse components before adding dependencies. Extract shared code only when it removes observed duplication.
- Keep STATUS under about 100 lines and handoffs under 250 words. Store command logs as files and summarize outcome.
- One writer for shell, shared contracts, migrations and package files. Sequential work is default; parallel roles are not required.
- No arbitrary token cap that causes incomplete security or dropped features. Reduce repeated context, not required verification.

## Scope and approval

Authorized by the implementation kickoff: local audit, documentation, branch/worktree if needed, local source edits, non-production fixtures, test migrations in a disposable database, tests and local preview. Preserve existing changes; do not reset or clean the user's worktree.

Excluded from the kickoff: production migration/data deletion, switching live dispatch on, real campaign sends, credential/DNS changes, replacing existing production services, merge and production deployment. Complete all independent code and prepare concrete reviewed changes before requesting those final actions. Missing access blocks only dependent verification; continue other work.

## Gates and recovery

Use scripts actually present in package.json. Snapshot scripts include `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; choose the package manager matching the real lockfile. Install with the lockfile when needed. Current unit test command requires Node support for its flags; inspect runtime before claiming a code failure. The migration test script must be reviewed before running and pointed only at a disposable test database.

Pre-existing failures go into the baseline, with explanation. New regressions must be fixed. Never silence tests, remove policies or change checks to claim completion. Production rollback should normally revert code/disable new capabilities; avoid destructive down migrations that erase new records. Keep existing deployments available until explicit cutover approval.
