import 'server-only';

import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getServiceRoleClient } from '@/lib/supabase-server';
import { notifyAutomation } from '@/lib/email/automations';
import { CONFIRMATION_DAYS, MAX_CONFIRMATIONS_PER_EMAIL_PER_DAY, MAX_SIGNUPS_PER_IP_PER_HOUR, createConfirmToken } from '@/lib/email/confirm';
import { SITE } from '@/lib/site/config';
import type { FormState } from './forms';

type Admin = NonNullable<ReturnType<typeof getServiceRoleClient>['client']>;

const MAX_ENQUIRIES_PER_HOUR = 5;
const MIN_FILL_TIME_MS = 2500;

export const enquirySchema = z.object({
  name: z.string().trim().min(1, 'Please tell us your name.').max(120),
  email: z.string().trim().email('Please enter a valid email address.').max(200),
  message: z.string().trim().min(10, 'Please write a little more (at least 10 characters).').max(5000),
  artworkId: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
  artworkTitle: z.string().max(300).optional(),
  sourcePage: z.string().max(300).optional(),
  marketingConsent: z.boolean(),
});

export const newsletterSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.').max(200),
  consent: z.literal(true, { error: 'Please confirm you would like to receive emails.' }),
});

/** Honeypot field filled, or the form was submitted faster than a person could type: treat as spam, silently. */
export function looksAutomated(honeypot: string | null, startedAt: string | null, now = Date.now()): boolean {
  if (honeypot && honeypot.trim() !== '') return true;
  const started = Number(startedAt);
  return !Number.isFinite(started) || now - started < MIN_FILL_TIME_MS;
}

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.ANALYTICS_SALT ?? 'artist-studio';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

function isMissing(error: { code?: string; message?: string } | null) {
  return Boolean(error && (['PGRST205', 'PGRST204', '42P01', '42703'].includes(error.code ?? '') || /does not exist|schema cache/i.test(error.message ?? '')));
}

async function findContactId(admin: Admin, email: string): Promise<string | null> {
  const { data } = await admin.from('contacts').select('id').ilike('email', email).limit(1).maybeSingle();
  return data?.id ?? null;
}

export async function recordEnquiry(input: z.infer<typeof enquirySchema>, ip: string | null): Promise<FormState> {
  const { client: admin, error } = getServiceRoleClient();
  if (!admin) {
    console.error('Enquiry not stored:', error);
    return { status: 'error', message: 'Enquiries are temporarily unavailable. Please email the studio directly.' };
  }

  const ipHash = hashIp(ip);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  if (ipHash) {
    const recent = await admin.from('enquiries').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since);
    if (!recent.error && (recent.count ?? 0) >= MAX_ENQUIRIES_PER_HOUR) {
      return { status: 'error', message: 'You have sent several messages recently. Please try again a little later.' };
    }
  }

  let contactId = await findContactId(admin, input.email);
  if (!contactId) {
    const created = await admin
      .from('contacts')
      .insert({
        name: input.name,
        email: input.email,
        type: 'lead',
        follow_up_status: 'new',
        source: 'website enquiry',
        consent_marketing: input.marketingConsent,
        consent_at: input.marketingConsent ? new Date().toISOString() : null,
      })
      .select('id')
      .single();
    if (created.error && isMissing(created.error)) {
      // Before the Studio migration contacts has no source/consent columns: store exactly what the old site stored.
      const legacy = await admin
        .from('contacts')
        .insert({
          name: input.name,
          email: input.email,
          type: 'lead',
          follow_up_status: 'new',
          notes: [input.artworkTitle ? `Enquiry about "${input.artworkTitle}"` : 'Website enquiry', input.message].join('\n\n'),
        })
        .select('id')
        .single();
      if (legacy.error) return { status: 'error', message: 'Your message could not be sent. Please try again.' };
      contactId = legacy.data.id;
    } else if (created.error) {
      return { status: 'error', message: 'Your message could not be sent. Please try again.' };
    } else {
      contactId = created.data.id;
    }
  } else if (input.marketingConsent) {
    await admin
      .from('contacts')
      .update({ consent_marketing: true, consent_at: new Date().toISOString(), unsubscribed_at: null })
      .eq('id', contactId)
      .then(() => undefined, () => undefined);
  }

  const enquiry = await admin.from('enquiries').insert({
    contact_id: contactId,
    artwork_id: input.artworkId ?? null,
    name: input.name,
    email: input.email,
    message: input.message,
    source_page: input.sourcePage ?? null,
    ip_hash: ipHash,
  });
  if (enquiry.error && !isMissing(enquiry.error)) {
    return { status: 'error', message: 'Your message could not be sent. Please try again.' };
  }

  if (!enquiry.error) {
    await admin
      .from('contact_interactions')
      .insert({
        contact_id: contactId,
        kind: 'enquiry',
        summary: input.artworkTitle ? `Enquired about "${input.artworkTitle}"` : 'Sent a website enquiry',
        artwork_id: input.artworkId ?? null,
      })
      .then(() => undefined, () => undefined);
    await admin
      .from('analytics_events')
      .insert({ event: 'enquiry', path: input.sourcePage ?? null, artwork_id: input.artworkId ?? null })
      .then(() => undefined, () => undefined);
  }

  await notifyAutomation('enquiry', {
    name: input.name,
    email: input.email,
    message: input.message,
    artwork: input.artworkTitle ?? null,
    sourcePage: input.sourcePage ?? null,
  });

  return { status: 'success', message: 'Thank you. Your message has reached the studio, and you will hear back soon.' };
}

/**
 * Double opt-in: a sign-up only records a pending confirmation and emails a confirmation link. The address joins the
 * mailing list (marketing consent) when the link is confirmed on /confirm-subscription. Before the quick-wins migration
 * there is nowhere to keep pending sign-ups, so the previous single opt-in behaviour is kept.
 */
export async function recordNewsletterSignup(email: string, ip: string | null): Promise<FormState> {
  const { client: admin } = getServiceRoleClient();
  if (!admin) return { status: 'error', message: 'Sign-up is temporarily unavailable.' };

  const normalized = email.trim().toLowerCase();
  const ipHash = hashIp(ip);
  const checkInbox: FormState = { status: 'success', message: 'Thank you. Please check your inbox and confirm your subscription.' };

  if (ipHash) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recent = await admin.from('newsletter_confirmations').select('token_hash', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since);
    if (recent.error && isMissing(recent.error)) return recordSingleOptIn(admin, email);
    if (!recent.error && (recent.count ?? 0) >= MAX_SIGNUPS_PER_IP_PER_HOUR) {
      return { status: 'error', message: 'There have been several sign-ups from here recently. Please try again a little later.' };
    }
  }

  // Never email the same address over and over (someone else may be typing it in), and say the same thing either way.
  const daySince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const forEmail = await admin.from('newsletter_confirmations').select('token_hash', { count: 'exact', head: true }).eq('email_normalized', normalized).gte('created_at', daySince);
  if (forEmail.error && isMissing(forEmail.error)) return recordSingleOptIn(admin, email);
  if (!forEmail.error && (forEmail.count ?? 0) >= MAX_CONFIRMATIONS_PER_EMAIL_PER_DAY) return checkInbox;

  // Already on the list: nothing to confirm. The visitor sees the same message, so membership is not revealed.
  const { data: subscribed } = await admin
    .from('contacts')
    .select('id')
    .ilike('email', escapeLike(normalized))
    .eq('consent_marketing', true)
    .is('unsubscribed_at', null)
    .limit(1)
    .maybeSingle();
  if (subscribed) return checkInbox;

  const { token, tokenHash } = createConfirmToken();
  const inserted = await admin.from('newsletter_confirmations').insert({
    token_hash: tokenHash,
    email_normalized: normalized,
    ip_hash: ipHash,
    expires_at: new Date(Date.now() + CONFIRMATION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (inserted.error && isMissing(inserted.error)) return recordSingleOptIn(admin, email);
  if (inserted.error) return { status: 'error', message: 'Sign-up failed. Please try again.' };

  await notifyAutomation('newsletter_confirm', {
    email: normalized,
    confirmUrl: `${SITE.url}/confirm-subscription?t=${token}`,
    expiresInDays: CONFIRMATION_DAYS,
  });
  return checkInbox;
}

export const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/** The original behaviour, used only until the quick-wins migration adds newsletter_confirmations. */
async function recordSingleOptIn(admin: Admin, email: string): Promise<FormState> {
  const now = new Date().toISOString();
  const existingId = await findContactId(admin, email);
  if (existingId) {
    const updated = await admin
      .from('contacts')
      .update({ consent_marketing: true, consent_at: now, unsubscribed_at: null })
      .eq('id', existingId);
    if (updated.error && !isMissing(updated.error)) return { status: 'error', message: 'Sign-up failed. Please try again.' };
  } else {
    const created = await admin.from('contacts').insert({
      name: email.split('@')[0],
      email,
      type: 'lead',
      source: 'newsletter',
      consent_marketing: true,
      consent_at: now,
    });
    if (created.error && isMissing(created.error)) {
      const legacy = await admin.from('contacts').insert({
        name: email.split('@')[0],
        email,
        type: 'lead',
        notes: `Newsletter sign-up, consent given ${now}`,
      });
      if (legacy.error) return { status: 'error', message: 'Sign-up failed. Please try again.' };
    } else if (created.error) {
      return { status: 'error', message: 'Sign-up failed. Please try again.' };
    }
    await notifyAutomation('welcome', { email });
  }

  await admin.from('analytics_events').insert({ event: 'newsletter_signup' }).then(() => undefined, () => undefined);
  return { status: 'success', message: 'Thank you for subscribing.' };
}
