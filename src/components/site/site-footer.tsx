import Link from 'next/link';
import { SITE, SITE_NAV } from '@/lib/site/config';
import { NewsletterForm } from './newsletter-form';

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-ink text-paper">
      <div className="site-container grid gap-16 py-20 lg:grid-cols-12 lg:py-28">
        <div className="lg:col-span-6">
          <p className="eyebrow text-paper/50">Studio news</p>
          <h2 className="mt-4 font-display text-4xl font-light leading-tight sm:text-5xl">
            New works, exhibitions and studio notes, a few times a year.
          </h2>
          <div className="mt-10">
            <NewsletterForm tone="dark" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 text-sm lg:col-span-5 lg:col-start-8">
          <nav aria-label="Footer">
            <p className="eyebrow mb-5 text-paper/50">Explore</p>
            <ul className="space-y-3">
              {SITE_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="link-underline">{item.name}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="eyebrow mb-5 text-paper/50">Contact</p>
            <ul className="space-y-3">
              <li><a href={`mailto:${SITE.contactEmail}`} className="link-underline break-all">{SITE.contactEmail}</a></li>
              <li>
                <a href={`https://instagram.com/${SITE.instagram}`} target="_blank" rel="noopener noreferrer" className="link-underline">
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="site-container flex flex-col gap-2 border-t border-paper/10 py-6 text-xs text-paper/50 sm:flex-row sm:justify-between">
        <p>© {year} {SITE.artistName}. All artworks and images are protected by copyright.</p>
        <Link href="/login" className="hover:text-paper">Studio</Link>
      </div>
    </footer>
  );
}
