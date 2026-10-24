'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getOwnerClient } from '@/lib/auth/require-owner';

const CONTACT_TYPES = ['collector', 'gallery', 'curator', 'buyer', 'lead', 'vendor'] as const;

const collectorSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().email('Enter a valid email').max(200).or(z.literal('')),
  phone: z.string().trim().max(60).optional(),
  company: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
  type: z.enum(CONTACT_TYPES),
  follow_up_status: z.string().trim().max(60).optional(),
  interests: z.string().max(500).optional(),
  tags: z.string().max(500).optional(),
  notes: z.string().max(10_000).optional(),
  consent_marketing: z.boolean(),
});

const list = (value?: string) => (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);

export type ActionResult = { success: boolean; error?: string | null; id?: string };

export async function saveCollectorAction(id: string | null, formData: FormData): Promise<ActionResult> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };

  const parsed = collectorSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email') ?? '',
    phone: formData.get('phone') || undefined,
    company: formData.get('company') || undefined,
    location: formData.get('location') || undefined,
    type: formData.get('type') || 'collector',
    follow_up_status: formData.get('follow_up_status') || undefined,
    interests: formData.get('interests') || undefined,
    tags: formData.get('tags') || undefined,
    notes: formData.get('notes') || undefined,
    consent_marketing: formData.get('consent_marketing') === 'on',
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  const values = parsed.data;
  if (values.email && !id) {
    const { data: existing } = await client.from('contacts').select('id').ilike('email', values.email).limit(1).maybeSingle();
    if (existing) return { success: false, error: 'A collector with this email already exists.', id: existing.id };
  }

  const record = {
    name: values.name,
    email: values.email || null,
    phone: values.phone ?? null,
    company: values.company ?? null,
    location: values.location ?? null,
    type: values.type,
    follow_up_status: values.follow_up_status ?? null,
    interests: list(values.interests),
    tags: list(values.tags),
    notes: values.notes ?? null,
    consent_marketing: values.consent_marketing,
    updated_at: new Date().toISOString(),
  };

  // Consent is only time-stamped when it is newly given, and withdrawing it records an unsubscribe.
  let consentFields: Record<string, string | null> = {};
  if (id) {
    const { data: before } = await client.from('contacts').select('consent_marketing').eq('id', id).maybeSingle();
    if (before && !before.consent_marketing && values.consent_marketing) consentFields = { consent_at: new Date().toISOString(), unsubscribed_at: null };
    if (before?.consent_marketing && !values.consent_marketing) consentFields = { unsubscribed_at: new Date().toISOString() };
  } else if (values.consent_marketing) {
    consentFields = { consent_at: new Date().toISOString() };
  }

  const query = id
    ? client.from('contacts').update({ ...record, ...consentFields }).eq('id', id).select('id').single()
    : client.from('contacts').insert({ ...record, ...consentFields, source: 'studio' }).select('id').single();
  const { data, error: saveError } = await query;
  if (saveError) return { success: false, error: saveError.message };

  revalidatePath('/studio/collectors');
  if (id) revalidatePath(`/studio/collectors/${id}`);
  return { success: true, id: data.id };
}

export async function addInteractionAction(contactId: string, formData: FormData): Promise<ActionResult> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };
  const kind = String(formData.get('kind') ?? 'note');
  const summary = String(formData.get('summary') ?? '').trim();
  if (!summary) return { success: false, error: 'Write a short note first.' };

  const { error: insertError } = await client.from('contact_interactions').insert({
    contact_id: contactId,
    kind: ['note', 'email', 'call', 'meeting'].includes(kind) ? kind : 'note',
    summary: summary.slice(0, 2000),
    occurred_at: (formData.get('occurred_at') as string) || new Date().toISOString(),
  });
  if (insertError) return { success: false, error: insertError.message };
  await client.from('contacts').update({ last_contacted_at: new Date().toISOString() }).eq('id', contactId);
  revalidatePath(`/studio/collectors/${contactId}`);
  return { success: true };
}

export async function setEnquiryStatusAction(id: string, status: string): Promise<ActionResult> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };
  if (!['new', 'replied', 'follow_up', 'closed', 'spam'].includes(status)) return { success: false, error: 'Unknown status' };
  const { error: updateError } = await client.from('enquiries').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (updateError) return { success: false, error: updateError.message };
  revalidatePath('/studio/enquiries');
  revalidatePath('/studio');
  return { success: true };
}
