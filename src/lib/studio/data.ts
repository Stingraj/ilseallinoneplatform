import 'server-only';

import { redirect } from 'next/navigation';
import { getOwnerClient } from '@/lib/auth/require-owner';

export type OwnerClient = NonNullable<Awaited<ReturnType<typeof getOwnerClient>>['client']>;

/** For studio server components: the owner's session client, or a redirect to sign in. */
export async function requireOwnerPage(): Promise<OwnerClient> {
  const { client } = await getOwnerClient();
  if (!client) redirect('/login?error=not-owner');
  return client;
}

/** True when PostgREST says a table/column is missing, i.e. the Studio migration has not been applied yet. */
export function isMissingSchema(error: { code?: string; message?: string } | null | undefined): boolean {
  return Boolean(
    error && (['PGRST205', 'PGRST204', '42P01', '42703'].includes(error.code ?? '') || /does not exist|schema cache|Could not find/i.test(error.message ?? ''))
  );
}

/** Thrown-free result wrapper used by studio pages to show setup notices instead of fake data. */
export interface Loaded<T> {
  data: T;
  missingSchema: boolean;
  error: string | null;
}

export function loaded<T>(data: T | null | undefined, error: { code?: string; message?: string } | null, fallback: T): Loaded<T> {
  if (!error) return { data: data ?? fallback, missingSchema: false, error: null };
  return { data: fallback, missingSchema: isMissingSchema(error), error: isMissingSchema(error) ? null : error.message ?? 'Unknown error' };
}

export const MIGRATION_HINT =
  'Apply supabase/migrations/20261025000100_studio_additive_schema.sql (staging first) to enable this section.';
