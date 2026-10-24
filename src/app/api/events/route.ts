import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServiceRoleClient } from '@/lib/supabase-server';

const eventSchema = z.object({
  event: z.enum(['page_view', 'artwork_view', 'viewing_room_open']),
  path: z.string().max(300).optional(),
  artworkId: z.string().uuid().optional(),
});

/** Stores anonymous event counts for the Overview. Never stores IPs, user agents or any personal data. */
export async function POST(request: NextRequest) {
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 204 });
  // Ignore obvious bots.
  if (/bot|crawl|spider|preview/i.test(request.headers.get('user-agent') ?? '')) return new NextResponse(null, { status: 204 });

  const { client } = getServiceRoleClient();
  if (client) {
    await client
      .from('analytics_events')
      .insert({ event: parsed.data.event, path: parsed.data.path ?? null, artwork_id: parsed.data.artworkId ?? null })
      .then(() => undefined, () => undefined);
  }
  return new NextResponse(null, { status: 204 });
}
