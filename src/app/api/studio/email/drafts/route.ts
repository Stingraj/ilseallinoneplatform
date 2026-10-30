import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { isMissingSchema } from '@/lib/studio/data';

const draftSchema = z.object({
  id: z.string().uuid().nullish(),
  title: z.string().trim().min(1).max(300),
  subject: z.string().max(300).default(''),
  previewText: z.string().max(500).default(''),
  templateType: z.string().max(60).default('custom_announcement'),
  templateData: z.record(z.string(), z.unknown()).default({}),
  rawHtml: z.string().max(2_000_000).nullish(),
});

const unavailable = (error: { code?: string; message?: string } | null) =>
  NextResponse.json(
    { message: isMissingSchema(error) ? 'Studio drafts need the database migration (20261030000000_studio_workflows.sql).' : 'The draft could not be saved.' },
    { status: 503 }
  );

async function save(request: NextRequest, update: boolean) {
  const { client, error } = await getOwnerClient();
  if (!client) return NextResponse.json({ message: error }, { status: 401 });
  const parsed = draftSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: 'The draft is incomplete.' }, { status: 400 });
  const d = parsed.data;
  const record = {
    title: d.title,
    subject: d.subject,
    preview_text: d.previewText,
    template_type: d.templateType,
    template_data: d.templateData,
    raw_html: d.rawHtml ?? null,
    updated_at: new Date().toISOString(),
  };

  if (update && d.id) {
    const { data: current, error: readError } = await client.from('email_campaign_drafts').select('revision').eq('id', d.id).maybeSingle();
    if (readError) return unavailable(readError);
    if (!current) return NextResponse.json({ message: 'This draft no longer exists.' }, { status: 404 });
    const { error: writeError } = await client
      .from('email_campaign_drafts')
      .update({ ...record, revision: current.revision + 1 })
      .eq('id', d.id)
      .eq('revision', current.revision);
    if (writeError) return unavailable(writeError);
    return NextResponse.json({ id: d.id, revision: current.revision + 1 });
  }
  const { data, error: insertError } = await client.from('email_campaign_drafts').insert(record).select('id, revision').single();
  if (insertError) return unavailable(insertError);
  return NextResponse.json(data);
}

export const POST = (request: NextRequest) => save(request, false);
export const PATCH = (request: NextRequest) => save(request, true);
