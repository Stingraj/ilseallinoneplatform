import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { isStudioOwner } from '@/lib/auth/owner';

/** Session-checked Supabase client for dashboard server actions and routes. Only the studio owner gets one. */
export async function getOwnerClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return { client: null, user: null, error: `Unable to verify your Supabase session: ${error.message}` } as const;
  }
  if (!user) {
    return { client: null, user: null, error: 'You must be signed in to use this dashboard action.' } as const;
  }
  if (!isStudioOwner(user)) {
    return { client: null, user: null, error: 'This account is not allowed to manage the studio.' } as const;
  }
  return { client: supabase, user, error: null } as const;
}
