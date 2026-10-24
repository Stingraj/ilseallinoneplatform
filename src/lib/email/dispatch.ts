import { z } from 'zod';

/** The Email Studio's n8n payload. It is forwarded unchanged; existing workflows depend on this shape. */
export const campaignPayloadSchema = z.object({
  contacts: z
    .array(z.object({ email: z.string().email(), name: z.string().max(200) }))
    .min(1)
    .max(10_000),
  subject: z.string().trim().min(1).max(300),
  body: z.string().min(1).max(2_000_000),
});

export type CampaignPayload = z.infer<typeof campaignPayloadSchema>;
export type DispatchMode = 'disabled' | 'test' | 'live';

export interface DispatchTarget {
  mode: DispatchMode;
  url: string | null;
  /** Why nothing can be sent, when url is null. */
  reason?: string;
}

/**
 * Chooses where a campaign goes. Anything other than an explicit EMAIL_DISPATCH_MODE=live stays away from the live
 * workflow, so a preview deployment or a local run can never email real recipients by accident.
 */
export function resolveDispatchTarget(env: Record<string, string | undefined>): DispatchTarget {
  const raw = (env.EMAIL_DISPATCH_MODE ?? 'disabled').trim().toLowerCase();
  const mode: DispatchMode = raw === 'live' || raw === 'test' ? raw : 'disabled';

  if (mode === 'disabled') {
    return { mode, url: null, reason: 'Sending is turned off (EMAIL_DISPATCH_MODE is not "test" or "live").' };
  }
  const url = mode === 'live' ? env.N8N_CAMPAIGN_WEBHOOK_URL : env.N8N_TEST_WEBHOOK_URL;
  const variable = mode === 'live' ? 'N8N_CAMPAIGN_WEBHOOK_URL' : 'N8N_TEST_WEBHOOK_URL';
  if (!url) return { mode, url: null, reason: `${variable} is not set.` };
  if (!/^https:\/\//.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) {
    return { mode, url: null, reason: `${variable} must be an https:// address.` };
  }
  return { mode, url };
}

export function n8nHeaders(env: Record<string, string | undefined>): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Lets the n8n Webhook node use Header Auth. Workflows that do not check it are unaffected.
  if (env.N8N_WEBHOOK_SECRET) headers['X-Studio-Secret'] = env.N8N_WEBHOOK_SECRET;
  return headers;
}
