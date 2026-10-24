import 'server-only';

import { createClient } from '@supabase/supabase-js';

export const SERVICE_ROLE_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

export function getMissingServiceRoleEnvVars() {
  return SERVICE_ROLE_ENV_VARS.filter((envVar) => !process.env[envVar]);
}

export function getServiceRoleConfigError(missingEnvVars = getMissingServiceRoleEnvVars()) {
  const envList = missingEnvVars.join(', ');
  return `Supabase service-role configuration is missing. Set ${envList} in Vercel to enable this action.`;
}

export function getServiceRoleClient() {
  const missingEnvVars = getMissingServiceRoleEnvVars();

  if (missingEnvVars.length > 0) {
    return {
      client: null,
      error: getServiceRoleConfigError(missingEnvVars),
      missingEnvVars,
    } as const;
  }

  return {
    client: createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    ),
    error: null,
    missingEnvVars: [],
  } as const;
}
