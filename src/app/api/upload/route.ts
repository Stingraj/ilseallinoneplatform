import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isStudioOwner } from '@/lib/auth/owner';

const ALLOWED_BUCKETS = new Set(['artist-profile']);
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

function sanitizePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._/-]/g, '-');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: `Unable to verify your session: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to upload a profile photo.' },
        { status: 401 }
      );
    }

    if (!isStudioOwner(user)) {
      return NextResponse.json({ error: 'This account is not allowed to manage the studio.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const bucket = formData.get('bucket')?.toString() || '';
    const rawPath = formData.get('path')?.toString() || '';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No upload file was provided.' }, { status: 400 });
    }

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: 'Unsupported upload bucket.' }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Profile photo must be a JPG, PNG, or WEBP image.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      return NextResponse.json(
        { error: 'Profile photo must be 5MB or smaller.' },
        { status: 400 }
      );
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safePath = sanitizePathSegment(rawPath || `avatar-${Date.now()}.${extension}`);
    const uploadPath = safePath.includes('.') ? safePath : `${safePath}.${extension}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(uploadPath, fileBuffer, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(uploadPath);

    return NextResponse.json({ url: data.publicUrl });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Profile photo upload failed.' },
      { status: 500 }
    );
  }
}
