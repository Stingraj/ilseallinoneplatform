'use server';

import { headers } from 'next/headers';
import { enquirySchema, looksAutomated, newsletterSchema, recordEnquiry, recordNewsletterSignup } from '@/lib/website/enquiries';
import type { FormState } from '@/lib/website/forms';

async function clientIp() {
  const list = await headers();
  return list.get('x-real-ip') ?? list.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}

function echo(formData: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, String(formData.get(key) ?? '')]));
}

export async function submitEnquiry(_previous: FormState, formData: FormData): Promise<FormState> {
  if (looksAutomated(formData.get('company') as string | null, formData.get('startedAt') as string | null)) {
    // Do not tell bots they were caught.
    return { status: 'success', message: 'Thank you. Your message has reached the studio, and you will hear back soon.' };
  }

  const parsed = enquirySchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
    artworkId: formData.get('artworkId') ?? undefined,
    artworkTitle: (formData.get('artworkTitle') as string) || undefined,
    sourcePage: (formData.get('sourcePage') as string) || undefined,
    marketingConsent: formData.get('marketingConsent') === 'on',
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: 'error', message: 'Please check the highlighted fields.', fieldErrors, values: echo(formData, ['name', 'email', 'message']) };
  }
  const result = await recordEnquiry(parsed.data, await clientIp());
  return result.status === 'error' ? { ...result, values: echo(formData, ['name', 'email', 'message']) } : result;
}

export async function subscribeNewsletter(_previous: FormState, formData: FormData): Promise<FormState> {
  if (looksAutomated(formData.get('company') as string | null, formData.get('startedAt') as string | null)) {
    return { status: 'success', message: 'Thank you for subscribing.' };
  }
  const parsed = newsletterSchema.safeParse({ email: formData.get('email'), consent: formData.get('consent') === 'on' });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: 'error', message: Object.values(fieldErrors)[0] ?? 'Please check the form.', fieldErrors, values: echo(formData, ['email']) };
  }
  const result = await recordNewsletterSignup(parsed.data.email);
  return result.status === 'error' ? { ...result, values: echo(formData, ['email']) } : result;
}
