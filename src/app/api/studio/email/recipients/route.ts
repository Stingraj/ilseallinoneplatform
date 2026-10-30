import { NextResponse } from 'next/server';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { normalizeEmail } from '@/lib/email/eligibility';
import { isMissingSchema } from '@/lib/studio/data';

/** Collectors who agreed to marketing email and have not unsubscribed, de-duplicated by address. */
export async function GET() {
  const { client, error } = await getOwnerClient();
  if (!client) return NextResponse.json({ message: error }, { status: 401 });

  const rows: { email: string | null; name: string | null; consent_marketing: boolean | null; unsubscribed_at: string | null }[] = [];
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error: queryError } = await client
      .from('contacts')
      .select('email, name, consent_marketing, unsubscribed_at')
      .not('email', 'is', null)
      .range(from, from + 999);
    if (queryError) {
      return NextResponse.json(
        { message: isMissingSchema(queryError) ? 'Consent fields need the Studio database migration.' : 'Collectors could not be loaded.' },
        { status: 503 }
      );
    }
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const suppressed = new Set(rows.filter((r) => r.unsubscribed_at && r.email).map((r) => normalizeEmail(r.email!)));
  const recipients = new Map<string, { email: string; name: string }>();
  let withoutConsent = 0;
  for (const row of rows) {
    if (!row.email) continue;
    const key = normalizeEmail(row.email);
    if (suppressed.has(key)) continue;
    if (!row.consent_marketing) {
      withoutConsent += 1;
      continue;
    }
    if (!recipients.has(key)) recipients.set(key, { email: row.email.trim(), name: row.name ?? '' });
  }
  return NextResponse.json({
    recipients: [...recipients.values()],
    excluded: { unsubscribed: suppressed.size, withoutConsent },
  });
}
