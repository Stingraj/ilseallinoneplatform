import type { User } from '@supabase/supabase-js';

/**
 * The studio belongs to one artist. Being signed in is not enough: the account's email must be listed in
 * STUDIO_OWNER_EMAILS (comma separated). When the variable is unset nobody is treated as the owner, so a missing
 * setting locks the dashboard instead of opening it to every Supabase account.
 */
export function getOwnerEmails(): string[] {
  return (process.env.STUDIO_OWNER_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isStudioOwner(user: Pick<User, 'email'> | null | undefined): boolean {
  const email = user?.email?.toLowerCase();
  return Boolean(email) && getOwnerEmails().includes(email as string);
}
