import { NextResponse, type NextRequest } from 'next/server';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { campaignPayloadSchema, n8nHeaders, resolveDispatchTarget } from '@/lib/email/dispatch';

/** Server relay for the Email Studio: owner-only, validated, and sends to n8n only in the configured mode. */
export async function POST(request: NextRequest) {
  const { client, error: authError } = await getOwnerClient();
  if (!client) return NextResponse.json({ message: authError }, { status: 401 });

  const parsed = campaignPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'The campaign is incomplete or has invalid recipients.' }, { status: 400 });
  }

  const target = resolveDispatchTarget(process.env);
  if (!target.url) return NextResponse.json({ message: target.reason }, { status: 503 });

  let status = 0;
  let text = '';
  try {
    const res = await fetch(target.url, {
      method: 'POST',
      headers: n8nHeaders(process.env),
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });
    status = res.status;
    text = await res.text();
  } catch (error) {
    text = error instanceof Error ? error.message : 'Network error';
  }

  // Campaign history for the Overview. Best effort: a missing table must not block sending.
  await client
    .from('email_campaign_log')
    .insert({
      subject: parsed.data.subject,
      recipient_count: parsed.data.contacts.length,
      dispatch_mode: target.mode,
      http_status: status || null,
      succeeded: status >= 200 && status < 300,
    })
    .then(() => undefined, () => undefined);

  if (status >= 200 && status < 300) {
    const prefix = target.mode === 'test' ? '[TEST workflow] ' : '';
    let message = text;
    try {
      const json = JSON.parse(text);
      message = json.message ?? JSON.stringify(json);
    } catch {}
    return NextResponse.json({ message: `${prefix}${message || 'Workflow was successfully started.'}` });
  }
  return NextResponse.json(
    { message: status ? `n8n returned HTTP ${status}: ${text.slice(0, 300)}` : `Could not reach n8n: ${text}` },
    { status: 502 }
  );
}
