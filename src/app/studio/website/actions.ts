'use server';

import { revalidatePath } from 'next/cache';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { isMissingSchema } from '@/lib/studio/data';

/** Show or hide an artwork on the public website. Private and archived works can never be published. */
export async function setArtworkPublicAction(id: string, isPublic: boolean) {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };

  if (isPublic) {
    const { data } = await client.from('artworks').select('status').eq('id', id).maybeSingle();
    if (data && ['Private', 'Archived'].includes(data.status)) {
      return { success: false, error: 'Private and archived works cannot be shown on the website. Change the status first.' };
    }
  }

  const { error: updateError } = await client.from('artworks').update({ is_public: isPublic }).eq('id', id);
  if (updateError) {
    return {
      success: false,
      error: isMissingSchema(updateError) ? 'Publishing needs the Studio database migration.' : updateError.message,
    };
  }
  revalidatePath('/', 'layout');
  return { success: true };
}
