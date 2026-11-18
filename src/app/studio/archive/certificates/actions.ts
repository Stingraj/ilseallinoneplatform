'use server';

import { revalidatePath } from 'next/cache';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { certificateDetails, createVerifyCode } from '@/lib/certificates/codes';
import { nextInvoiceNumber } from '@/lib/invoices/totals';
import { SITE } from '@/lib/site/config';
import { isMissingSchema } from '@/lib/studio/data';

type Result = { success: boolean; error?: string | null; id?: string };

export async function issueCertificateAction(formData: FormData): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };

  const artworkId = String(formData.get('artwork_id') ?? '');
  const contactId = (formData.get('contact_id') as string) || null;
  const issuedOn = String(formData.get('issued_on') ?? '') || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issuedOn)) return { success: false, error: 'Choose a valid issue date.' };

  const [{ data: artwork }, { data: profile }, { data: contact }, numbers] = await Promise.all([
    client.from('artworks').select('id, title, year, medium, dimensions, signature, edition_number, edition_size, inventory_number, image_url').eq('id', artworkId).maybeSingle(),
    client.from('artist_profile').select('full_name').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    contactId ? client.from('contacts').select('id, name').eq('id', contactId).maybeSingle() : Promise.resolve({ data: null }),
    client.from('artwork_certificates').select('certificate_number'),
  ]);
  if (numbers.error) {
    return { success: false, error: isMissingSchema(numbers.error) ? 'Certificates need the quick-wins database update (20261118000000_studio_quick_wins.sql).' : numbers.error.message };
  }
  if (!artwork) return { success: false, error: 'Choose an artwork from the archive.' };

  const details = certificateDetails(artwork, profile?.full_name || SITE.artistName);
  const issuedTo = String(formData.get('issued_to') ?? '').trim().slice(0, 200) || contact?.name || null;
  const year = Number(issuedOn.slice(0, 4));

  // certificate_number and verify_code are unique; retry once if another certificate took the number meanwhile.
  let number = nextInvoiceNumber((numbers.data ?? []).map((row) => row.certificate_number), year, 'COA');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data: created, error: insertError } = await client
      .from('artwork_certificates')
      .insert({
        artwork_id: artwork.id,
        certificate_number: number,
        verify_code: createVerifyCode(),
        details,
        contact_id: contact?.id ?? null,
        issued_to: issuedTo,
        issued_on: issuedOn,
      })
      .select('id')
      .single();
    if (!insertError) {
      if (contact?.id) {
        await client
          .from('contact_interactions')
          .insert({ contact_id: contact.id, kind: 'note', summary: `Certificate of authenticity ${number} issued for "${details.title}"`, artwork_id: artwork.id })
          .then(() => undefined, () => undefined);
      }
      revalidatePath('/studio/archive/certificates');
      return { success: true, id: created.id };
    }
    if (insertError.code !== '23505') return { success: false, error: insertError.message };
    number = nextInvoiceNumber([number], year, 'COA');
  }
  return { success: false, error: 'Could not allocate a certificate number. Please try again.' };
}

export async function revokeCertificateAction(id: string, reason: string): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };
  const { error: updateError } = await client
    .from('artwork_certificates')
    .update({ revoked_at: new Date().toISOString(), revoke_reason: reason.trim().slice(0, 500) || null })
    .eq('id', id)
    .is('revoked_at', null);
  if (updateError) return { success: false, error: updateError.message };
  revalidatePath('/studio/archive/certificates');
  return { success: true };
}
