'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { isMissingSchema } from '@/lib/studio/data';

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
  const save = (record: Record<string, unknown>) =>
    id
      ? client.from('exhibitions').update(record).eq('id', id).select('id').single()
      : client.from('exhibitions').insert(record).select('id').single();
  let { data, error: saveError } = await save(values);
  if (saveError && isMissingSchema(saveError)) {
    // Before the Studio migration: save the original columns only (no publishing, cover or link yet).
    const { is_published: _p, cover_image_url: _c, external_url: _e, ...original } = values;
    void _p; void _c; void _e;
    ({ data, error: saveError } = await save(original));
  }
  if (saveError || !data) return { success: false, error: saveError?.message ?? 'Could not save' };

  const artworkIds = formData.getAll('artwork_ids').map(String).filter(Boolean);
  await client.from('exhibition_artworks').delete().eq('exhibition_id', data.id);
  if (artworkIds.length) {
    const { error: linkError } = await client.from('exhibition_artworks').insert(artworkIds.map((artwork_id) => ({ exhibition_id: data.id, artwork_id })));
    if (linkError) return { success: false, error: `Saved, but artworks could not be linked: ${linkError.message}`, id: data.id };
  }

  revalidatePath('/studio/exhibitions');
  revalidatePath('/', 'layout');
  return { success: true, id: data.id };
}
