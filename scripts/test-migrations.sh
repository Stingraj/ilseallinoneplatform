#!/usr/bin/env bash
# Applies the archive's original migrations, then the Studio migrations, runs the RLS checks, rolls everything back
# and re-applies it, on a throwaway local Postgres. Usage: scripts/test-migrations.sh <archive-repo-path> <psql args...>
set -euo pipefail
ARCHIVE="$1"; shift
PSQL=(psql -v ON_ERROR_STOP=1 -q "$@")
"${PSQL[@]}" -c 'drop database if exists studio_migration_test' -d postgres
"${PSQL[@]}" -c 'create database studio_migration_test' -d postgres
DB=(-d studio_migration_test)
"${PSQL[@]}" "${DB[@]}" -f supabase/tests/00_supabase_shim.sql
for file in "$ARCHIVE"/supabase/migrations/*.sql; do
  echo "archive: $(basename "$file")"
  "${PSQL[@]}" "${DB[@]}" -f "$file"
done
apply() {
  for file in supabase/migrations/*.sql; do echo "studio:  $(basename "$file")"; "${PSQL[@]}" "${DB[@]}" -f "$file"; done
}
apply
"${PSQL[@]}" "${DB[@]}" -f supabase/tests/10_rls_checks.sql
"${PSQL[@]}" "${DB[@]}" -f supabase/tests/20_workflow_checks.sql
echo "rollback"
"${PSQL[@]}" "${DB[@]}" -c 'delete from public.enquiries; delete from public.contacts; delete from public.studio_owners; delete from auth.users;'
"${PSQL[@]}" "${DB[@]}" -f supabase/rollback/20261030000000_studio_workflows.down.sql
"${PSQL[@]}" "${DB[@]}" -f supabase/rollback/20261025000100_studio_additive_schema.down.sql
"${PSQL[@]}" "${DB[@]}" -f supabase/rollback/20261025000000_studio_owner_security.down.sql
echo "re-apply after rollback"
"${PSQL[@]}" "${DB[@]}" -c 'delete from public.exhibitions; delete from public.artworks;'
apply
"${PSQL[@]}" "${DB[@]}" -f supabase/tests/10_rls_checks.sql
"${PSQL[@]}" "${DB[@]}" -f supabase/tests/20_workflow_checks.sql
echo "ALL MIGRATION TESTS PASSED"
