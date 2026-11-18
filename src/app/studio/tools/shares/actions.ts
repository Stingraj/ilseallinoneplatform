'use server';

import { revalidatePath } from 'next/cache';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { MAX_SHARE_FILES, MAX_SHARE_FILE_BYTES, SHARE_BUCKET, isShareObjectPath } from '@/lib/shares/paths';
import { SITE } from '@/lib/site/config';
import { isMissingSchema } from '@/lib/studio/data';
import { createRoomToken } from '@/lib/viewing-rooms/tokens';

type Result = { success: boolean; error?: string | null; id?: string; link?: string };

const linkFor = (token: string) => `${SITE.url}/share/${token}`;

/** Step 1: create the share (and its artwork items). Uploaded files are added by registerShareFilesAction. */
export async function createShareAction(formData: FormData): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };

  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { success: false, error: 'Give the share a title.' };
  const passcode = String(formData.get('passcode') ?? '').trim();
  if (passcode && passcode.length < 6) return { success: false, error: 'Use a passcode of at least 6 characters, or leave it empty.' };
  const expiresOn = String(formData.get('expires_on') ?? '');
  if (expiresOn && !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) return { success: false, error: 'Choose a valid expiry date.' };
  const artworkIds = formData.getAll('artwork_ids').map(String).filter(Boolean).slice(0, MAX_SHARE_FILES);
  const fileCount = Number(formData.get('file_count') ?? 0);
  if (artworkIds.length === 0 && !(fileCount > 0)) return { success: false, error: 'Add at least one file or artwork image.' };
  const contactId = (formData.get('contact_id') as string) || null;

  const { token, tokenHash } = createRoomToken();
  const { data: share, error: insertError } = await client
    .from('file_shares')
    .insert({
      title: title.slice(0, 200),
      message: String(formData.get('message') ?? '').trim().slice(0, 4000) || null,
      token_hash: tokenHash,
      passcode: passcode || null,
      contact_id: contactId,
      expires_at: expiresOn ? new Date(`${expiresOn}T23:59:59Z`).toISOString() : null,
    })
    .select('id')
    .single();
  if (insertError) {
    return { success: false, error: isMissingSchema(insertError) ? 'File sharing needs the quick-wins database update (20261118000000_studio_quick_wins.sql).' : insertError.message };
  }

  if (artworkIds.length) {
    const { data: artworks } = await client.from('artworks').select('id, title, image_url').in('id', artworkIds);
    const rows = (artworks ?? [])
      .filter((a) => a.image_url)
      .map((a, index) => ({ share_id: share.id, artwork_id: a.id, file_name: `${a.title}.jpg`.slice(0, 200), sort_order: 1000 + index }));
    if (rows.length) {
      const { error: itemsError } = await client.from('file_share_items').insert(rows);
      if (itemsError) return { success: false, error: itemsError.message };
    }
  }

  if (contactId) {
    await client.from('contact_interactions').insert({ contact_id: contactId, kind: 'note', summary: `Files shared: ${title}` }).then(() => undefined, () => undefined);
  }
  revalidatePath('/studio/tools/shares');
  // The full link is shown once. Only its hash is stored.
  return { success: true, id: share.id, link: linkFor(token) };
}

/** Step 2: after the browser uploaded files to documents/shares/<id>/, record them (each upload is checked). */
export async function registerShareFilesAction(
  shareId: string,
  files: { path: string; name: string; size: number; type: string }[]
): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };
  if (files.length > MAX_SHARE_FILES) return { success: false, error: `At most ${MAX_SHARE_FILES} files per share.` };
  if (files.some((f) => !isShareObjectPath(shareId, f.path) || f.size > MAX_SHARE_FILE_BYTES)) return { success: false, error: 'Unexpected file.' };

  const { data: listed, error: listError } = await client.storage.from(SHARE_BUCKET).list(`shares/${shareId}`, { limit: 100 });
  if (listError) return { success: false, error: listError.message };
  const present = new Set((listed ?? []).map((object) => `shares/${shareId}/${object.name}`));
  const missing = files.filter((f) => !present.has(f.path));
  if (missing.length) return { success: false, error: `${missing.length} file(s) did not finish uploading.` };

  const { error: insertError } = await client.from('file_share_items').insert(
    files.map((f, index) => ({
      share_id: shareId,
      storage_path: f.path,
      file_name: f.name.slice(0, 200),
      content_type: f.type.slice(0, 100) || null,
      size_bytes: f.size,
      sort_order: index,
    }))
  );
  if (insertError) return { success: false, error: insertError.message };
  revalidatePath('/studio/tools/shares');
  return { success: true };
}

export async function revokeShareAction(id: string): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };
  const { error: updateError } = await client.from('file_shares').update({ revoked_at: new Date().toISOString() }).eq('id', id);
  if (updateError) return { success: false, error: updateError.message };
  revalidatePath('/studio/tools/shares');
  return { success: true };
}

/** Issues a fresh link (the old one stops working) and re-opens a revoked share. */
export async function renewShareLinkAction(id: string): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };
  const { token, tokenHash } = createRoomToken();
  const { error: updateError } = await client.from('file_shares').update({ token_hash: tokenHash, revoked_at: null }).eq('id', id);
  if (updateError) return { success: false, error: updateError.message };
  revalidatePath('/studio/tools/shares');
  return { success: true, link: linkFor(token) };
}

/** Deletes the share, its download log and its uploaded files. */
export async function deleteShareAction(id: string): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };
  const { data: items } = await client.from('file_share_items').select('storage_path').eq('share_id', id).not('storage_path', 'is', null);
  const paths = (items ?? []).map((i) => i.storage_path as string).filter((p) => isShareObjectPath(id, p));
  if (paths.length) {
    const { error: removeError } = await client.storage.from(SHARE_BUCKET).remove(paths);
    if (removeError) return { success: false, error: removeError.message };
  }
  const { error: deleteError } = await client.from('file_shares').delete().eq('id', id);
  if (deleteError) return { success: false, error: deleteError.message };
  revalidatePath('/studio/tools/shares');
  return { success: true };
}
