import Link from 'next/link';
import { PageHeader } from '@/components/studio/page-header';
import { requireOwnerPage } from '@/lib/studio/data';

export const dynamic = 'force-dynamic';

/** Escapes PostgREST ilike wildcards and the characters that would break an or() filter. */
function pattern(q: string) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[,()]/g, ' ')}%`;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? '').trim().slice(0, 80);
  const supabase = await requireOwnerPage();

  if (!q) {
    return (
      <div className="space-y-6">
        <PageHeader title="Search" description="Search artworks, collectors and exhibitions from the bar above." />
      </div>
    );
  }

  const like = pattern(q);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
  const [artworks, contacts, exhibitions] = await Promise.all([
    isUuid
      ? supabase.from('artworks').select('id, title, year, status').eq('id', q).limit(1)
      : supabase.from('artworks').select('id, title, year, status').ilike('title', like).order('updated_at', { ascending: false }).limit(20),
    supabase.from('contacts').select('id, name, email').or(`name.ilike.${like},email.ilike.${like}`).limit(20),
    supabase.from('exhibitions').select('id, title, venue, start_date').ilike('title', like).order('start_date', { ascending: false }).limit(20),
  ]);

  const groups = [
    { key: 'artworks', title: 'Artworks', result: artworks, items: (artworks.data ?? []).map((a) => ({ id: a.id, href: `/studio/archive/${a.id}`, primary: a.title, secondary: [a.year, a.status].filter(Boolean).join(' · ') })) },
    { key: 'contacts', title: 'Collectors', result: contacts, items: (contacts.data ?? []).map((c) => ({ id: c.id, href: `/studio/collectors/${c.id}`, primary: c.name || c.email, secondary: c.name ? c.email : '' })) },
    { key: 'exhibitions', title: 'Exhibitions', result: exhibitions, items: (exhibitions.data ?? []).map((x) => ({ id: x.id, href: `/studio/exhibitions/${x.id}`, primary: x.title, secondary: [x.venue, x.start_date].filter(Boolean).join(' · ') })) },
  ];
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader title={`Results for “${q}”`} description={total === 0 ? 'Nothing matched.' : `${total} match${total === 1 ? '' : 'es'}, up to 20 per group.`} />
      <div className="grid gap-5 lg:grid-cols-3">
        {groups.map((g) => (
          <section key={g.key} className="studio-card p-5" aria-labelledby={`sr-${g.key}`}>
            <h2 id={`sr-${g.key}`} className="mb-2 text-base font-semibold">{g.title} <span className="text-sm font-normal text-[color:var(--studio-muted)]">({g.result.error ? '—' : g.items.length})</span></h2>
            {g.result.error ? (
              <p className="text-sm text-[color:var(--studio-muted)]">Unavailable.</p>
            ) : g.items.length === 0 ? (
              <p className="text-sm text-[color:var(--studio-muted)]">No matches.</p>
            ) : (
              <ul className="divide-y divide-[color:var(--studio-line)]">
                {g.items.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="block min-h-11 py-2.5 hover:text-[color:var(--studio-accent)]">
                      <span className="block text-sm font-medium">{item.primary}</span>
                      {item.secondary && <span className="block text-xs text-[color:var(--studio-muted)]">{item.secondary}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
