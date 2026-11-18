'use server';

import { revalidatePath } from 'next/cache';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { isMissingSchema } from '@/lib/studio/data';
import { MAX_LINKS, checkLink } from '@/lib/website/links';

type Result = { success: boolean; error?: string | null };

const MIGRATION = 'Link in bio needs the quick-wins database update (20261118000000_studio_quick_wins.sql).';

function refresh() {
  revalidatePath('/links');
  revalidatePath('/studio/website/links');
}

export async function addLinkAction(formData: FormData): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };
  const checked = checkLink(String(formData.get('label') ?? ''), String(formData.get('url') ?? ''));
  if (!checked.ok) return { success: false, error: checked.error };

  const { data: existing, error: readError } = await client.from('website_links').select('sort_order');
  if (readError) return { success: false, error: isMissingSchema(readError) ? MIGRATION : readError.message };
  if ((existing ?? []).length >= MAX_LINKS) return { success: false, error: `Keep it to ${MAX_LINKS} links or fewer.` };
  const next = (existing ?? []).reduce((max, row) => Math.max(max, row.sort_order ?? 0), -1) + 1;

  const { error: insertError } = await client.from('website_links').insert({ ...checked.value, sort_order: next });
  if (insertError) return { success: false, error: insertError.message };
  refresh();
  return { success: true };
}

export async function updateLinkAction(id: string, label: string, url: string): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };
  const checked = checkLink(label, url);
  if (!checked.ok) return { success: false, error: checked.error };
  const { error: updateError } = await client
    .from('website_links')
    .update({ ...checked.value, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (updateError) return { success: false, error: updateError.message };
  refresh();
  return { success: true };
}

export async function setLinkVisibleAction(id: string, visible: boolean): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };
  const { error: updateError } = await client.from('website_links').update({ is_visible: visible, updated_at: new Date().toISOString() }).eq('id', id);
  if (updateError) return { success: false, error: updateError.message };
  refresh();
  return { success: true };
}

export async function deleteLinkAction(id: string): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };
  const { error: deleteError } = await client.from('website_links').delete().eq('id', id);
  if (deleteError) return { success: false, error: deleteError.message };
  refresh();
  return { success: true };
}

/** Saves the complete order. Every ID must already exist, so a stale page cannot add or drop links. */
export async function reorderLinksAction(ids: string[]): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };
  const { data: rows, error: readError } = await client.from('website_links').select('id');
  if (readError) return { success: false, error: readError.message };
  const known = new Set((rows ?? []).map((row) => row.id));
  if (ids.length !== known.size || ids.some((id) => !known.has(id))) {
    return { success: false, error: 'The links changed in another window. Reload the page and try again.' };
  }
  for (const [index, id] of ids.entries()) {
    const { error: updateError } = await client.from('website_links').update({ sort_order: index }).eq('id', id);
    if (updateError) return { success: false, error: updateError.message };
  }
  refresh();
  return { success: true };
}
