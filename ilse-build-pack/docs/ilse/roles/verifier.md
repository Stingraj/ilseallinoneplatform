# Verification role

Goal: independently review the implemented changes against 05-ACCEPTANCE and preservation evidence.

Read changed files and associated specs only. Start with high-risk invariants: existing public design/data, owner access, contact privacy, campaign consent/idempotency, exhibition atomicity and existing tool reachability.

Run actual package checks and targeted integration/browser checks. Use current installed framework docs and safe non-production fixtures. Do not change tests to accept incorrect behavior or report blocked tests as passing. Verify errors differ from empty data and workflow acceptance differs from delivery.

Report findings by severity with file evidence, exact failing scenario and suggested minimal fix. After fixes, rerun affected checks and necessary final gates. Summarize actual checks, remaining blockers and whether the local change is ready for review; production readiness requires its own evidence.
