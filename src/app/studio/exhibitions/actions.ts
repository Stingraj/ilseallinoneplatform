'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { isMissingSchema } from '@/lib/studio/data';
import { buildInvitationDraft } from '@/lib/email/invitation';
import { SITE } from '@/lib/site/config';
import { loadOrderedArtworks } from '@/lib/studio/exhibitions';

const exhibitionSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(300),
    venue: z.string().trim().max(300).optional(),
    location: z.string().trim().max(300).optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    description: z.string().max(20_000).optional(),
    cover_image_url: z.string().url().optional(),
    external_url: z.string().url().optional(),
    is_published: z.boolean(),
  })
  .refine((v) => !v.start_date || !v.end_date || v.start_date <= v.end_date, { message: 'The end date is before the start date.' });

const opt = (value: FormDataEntryValue | null) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

export async function saveExhibitionAction(id: string | null, formData: FormData) {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };

  const parsed = exhibitionSchema.safeParse({
    title: formData.get('title'),
    venue: opt(formData.get('venue')),
    location: opt(formData.get('location')),
    start_date: opt(formData.get('start_date')),
    end_date: opt(formData.get('end_date')),
    description: opt(formData.get('description')),
    cover_image_url: opt(formData.get('cover_image_url')),
    external_url: opt(formData.get('external_url')),
    is_published: formData.get('is_published') === 'on',
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  const values = {
    ...parsed.data,
    venue: parsed.data.venue ?? null,
    location: parsed.data.location ?? null,
    start_date: parsed.data.start_date ?? null,
    end_date: parsed.data.end_date ?? null,
    description: parsed.data.description ?? null,
    cover_image_url: parsed.data.cover_image_url ?? null,
    external_url: parsed.data.external_url ?? null,
    updated_at: new Date().toISOString(),
  };

  // Selected works, in the curated order, without duplicates.
  const artworkIds = [...new Set(formData.getAll('artwork_ids').map(String).filter((v) => /^[0-9a-f-]{36}$/i.test(v)))];
  const expected = opt(formData.get('expected_updated_at')) ?? null;

  // Preferred path: one database transaction (save_exhibition) for metadata and ordered membership.
  const rpc = await client.rpc('save_exhibition', {
    p_id: id,
    p_expected_updated_at: id ? expected : null,
    p_fields: values,
    p_artwork_ids: artworkIds,
  });
  let savedId: string | null = null;
  if (!rpc.error) {
    const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    savedId = row?.exhibition_id ?? null;
  } else if (isMissingFunction(rpc.error)) {
    const fallback = await saveWithoutTransaction(client, id, values, artworkIds);
    if (!fallback.success) return fallback;
    savedId = fallback.id;
  } else {
    return { success: false, error: explainSaveError(rpc.error) };
  }
  if (!savedId) return { success: false, error: 'The exhibition could not be saved.' };

  revalidatePath('/studio/exhibitions');
  revalidatePath('/', 'layout');
  revalidatePath(`/studio/exhibitions/${savedId}`);
  return { success: true, id: savedId };
}

function isMissingFunction(error: { code?: string; message?: string }) {
  return error.code === 'PGRST202' || error.code === '42883' || /could not find the function/i.test(error.message ?? '');
}

function explainSaveError(error: { code?: string; message?: string }) {
  const message = error.message ?? '';
  if (message.includes('stale_edit')) return 'This exhibition was changed elsewhere (another tab?). Reload the page to see the latest version, then make your changes again.';
  if (message.includes('unknown_artwork')) return 'One of the selected artworks no longer exists in the archive. Reload and choose again.';
  if (message.includes('end_before_start')) return 'The end date is before the start date.';
  if (message.includes('title_required')) return 'Title is required.';
  if (message.includes('not_owner')) return 'This account is not allowed to manage the studio.';
  if (message.includes('not_found')) return 'This exhibition no longer exists.';
  return 'The exhibition could not be saved. Nothing was changed; please try again.';
}

type OwnerClient = NonNullable<Awaited<ReturnType<typeof getOwnerClient>>['client']>;

/**
 * Used only until 20261030000000_studio_workflows.sql is applied. Not atomic, so every step is checked and the
 * previous membership is restored if replacing it fails.
 */
async function saveWithoutTransaction(client: OwnerClient, id: string | null, values: Record<string, unknown>, artworkIds: string[]) {
  const save = (record: Record<string, unknown>) =>
    id
      ? client.from('exhibitions').update(record).eq('id', id).select('id').single()
      : client.from('exhibitions').insert(record).select('id').single();
  let { data, error: saveError } = await save(values);
  if (saveError && isMissingSchema(saveError)) {
    const { is_published: _p, cover_image_url: _c, external_url: _e, ...original } = values;
    void _p; void _c; void _e;
    ({ data, error: saveError } = await save(original));
  }
  if (saveError || !data) return { success: false as const, error: 'The exhibition could not be saved. Please try again.' };

  const { data: previous, error: readError } = await client.from('exhibition_artworks').select('artwork_id').eq('exhibition_id', data.id);
  if (readError) return { success: false as const, error: 'Details saved, but the artwork list could not be updated. Please try again.', id: data.id };
  const { error: deleteError } = await client.from('exhibition_artworks').delete().eq('exhibition_id', data.id);
  if (deleteError) return { success: false as const, error: 'Details saved, but the artwork list could not be updated. Please try again.', id: data.id };
  if (artworkIds.length) {
    const { error: linkError } = await client.from('exhibition_artworks').insert(artworkIds.map((artwork_id) => ({ exhibition_id: data.id, artwork_id })));
    if (linkError) {
      if (previous?.length) await client.from('exhibition_artworks').insert(previous.map((row) => ({ exhibition_id: data.id, artwork_id: row.artwork_id })));
      return { success: false as const, error: 'Details saved, but the artwork list could not be updated; the previous list was kept.', id: data.id };
    }
  }
  return { success: true as const, id: data.id as string };
}

/**
 * Prepares an exhibition invitation as an Email Studio draft. Nothing is sent. Reuses the latest invitation draft
 * for this exhibition unless the owner asks for a new one.
 */
export async function prepareInvitationDraftAction(exhibitionId: string, mode: 'reuse' | 'new') {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false as const, error };

  if (mode === 'reuse') {
    const { data: existing, error: findError } = await client
      .from('email_campaign_drafts')
      .select('id')
      .eq('exhibition_id', exhibitionId)
      .eq('kind', 'exhibition_invitation')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (findError) return { success: false as const, error: isMissingSchema(findError) ? MIGRATION_NEEDED : 'Drafts could not be checked.' };
    if (existing) return { success: true as const, draftId: existing.id as string, reused: true };
  }

  const { data: exhibition } = await client
    .from('exhibitions')
    .select('id, title, venue, location, start_date, end_date, description, slug, is_published, external_url')
    .eq('id', exhibitionId)
    .maybeSingle();
  if (!exhibition) return { success: false as const, error: 'This exhibition no longer exists.' };

  const ordered = await loadOrderedArtworks(client, exhibitionId);
  const { data: publicRows } = await client.from('website_artworks').select('id').in('id', ordered.map((a) => a.id));
  const publicIds = new Set((publicRows ?? []).map((r) => r.id as string));
  const draft = buildInvitationDraft({
    artistName: SITE.artistName,
    siteUrl: SITE.url,
    exhibition,
    artworks: ordered.map((a) => ({ id: a.id, title: a.title, imageUrl: a.image_url, isPublic: publicIds.has(a.id) })),
  });

  const { data: created, error: insertError } = await client
    .from('email_campaign_drafts')
    .insert({
      kind: 'exhibition_invitation',
      title: `Invitation: ${exhibition.title}`,
      subject: draft.subject,
      preview_text: draft.previewText,
      template_type: draft.templateType,
      template_data: draft.templateData,
      exhibition_id: exhibitionId,
      artwork_ids: ordered.map((a) => a.id),
    })
    .select('id')
    .single();
  if (insertError || !created) return { success: false as const, error: isMissingSchema(insertError) ? MIGRATION_NEEDED : 'The invitation draft could not be created.' };
  revalidatePath(`/studio/exhibitions/${exhibitionId}`);
  return { success: true as const, draftId: created.id as string, reused: false };
}

const MIGRATION_NEEDED = 'Invitation drafts need the database migration (20261030000000_studio_workflows.sql).';
