'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { isStudioOwner } from '@/lib/auth/owner';

const PROFILE_ID = '00000000-0000-0000-0000-000000000001';

export async function saveProfileAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(`Unable to verify your Supabase session: ${authError.message}`);
  }

  if (!user) {
    throw new Error('You must be signed in to update the artist profile.');
  }

  if (!isStudioOwner(user)) {
    throw new Error('This account is not allowed to manage the studio.');
  }

  const { data: existingProfile, error: profileLookupError } = await supabase
    .from('artist_profile')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileLookupError) {
    throw new Error(`Unable to load the existing artist profile: ${profileLookupError.message}`);
  }

  const columns = existingProfile ? Object.keys(existingProfile) : [];

  const data: any = {
    id: existingProfile?.id || PROFILE_ID,
    full_name: formData.get('full_name')?.toString() || '',
    birth_year: formData.get('birth_year') ? parseInt(formData.get('birth_year') as string) : null,
    location: formData.get('location')?.toString() || '',
    updated_at: new Date().toISOString(),
  };

  const websiteVal = formData.get('website')?.toString() || '';
  if (columns.includes('website')) data.website = websiteVal;
  if (columns.length === 0 || columns.includes('website_url')) data.website_url = websiteVal;

  const bioVal = formData.get('bio')?.toString() || '';
  if (columns.includes('biography')) data.biography = bioVal;
  if (columns.length === 0 || columns.includes('bio')) data.bio = bioVal;

  const statementVal = formData.get('statement')?.toString() || '';
  if (columns.includes('artist_statement')) data.artist_statement = statementVal;
  if (columns.length === 0 || columns.includes('statement')) data.statement = statementVal;

  const photoVal = formData.get('profile_photo_url')?.toString() || '';
  if (columns.includes('profile_photo_url')) data.profile_photo_url = photoVal;
  if (columns.length === 0 || columns.includes('photo_url')) data.photo_url = photoVal;

  if (columns.length === 0 || columns.includes('email')) data.email = formData.get('email')?.toString() || '';
  if (columns.length === 0 || columns.includes('phone')) data.phone = formData.get('phone')?.toString() || '';
  if (columns.length === 0 || columns.includes('studio_address')) data.studio_address = formData.get('studio_address')?.toString() || '';

  const { error } = await supabase
    .from('artist_profile')
    .upsert(data);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/');
  revalidatePath('/studio/website/profile');
  revalidatePath('/', 'layout');
  return { success: true };
}
