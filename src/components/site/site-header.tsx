'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SITE_NAV } from '@/lib/site/config';
import { cn } from '@/lib/utils';


export function SiteHeader({ artistName }: { artistName: string }) {
  const pathname = usePathname();
  const overHero = pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu after navigating.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const light = overHero && !scrolled && !open;

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-500',
        light ? 'text-paper' : 'bg-paper/90 text-ink backdrop-blur-md',
        scrolled && !open && 'border-b border-ink/10'
      )}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-paper focus:px-3 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <div className="site-container flex h-16 items-center justify-between sm:h-20">
        <Link href="/" className="font-display text-xl tracking-wide sm:text-2xl">
          {artistName}
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-9 text-[12px] font-medium uppercase tracking-[0.22em]">
            {SITE_NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link href={item.href} aria-current={active ? 'page' : undefined} className={cn('link-underline', active && 'after:scale-x-100')}>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          type="button"
          className="relative -mr-2 h-11 w-11 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          <span className={cn('absolute left-2.5 right-2.5 top-[18px] h-px bg-current transition', open && 'top-1/2 rotate-45')} />
          <span className={cn('absolute left-2.5 right-2.5 top-[26px] h-px bg-current transition', open && 'top-1/2 -rotate-45')} />
        </button>
      </div>

      <div
        id="mobile-menu"
        hidden={!open}
        className="h-[calc(100dvh-4rem)] overflow-y-auto bg-paper px-5 pb-10 pt-6 text-ink md:hidden"
      >
        <nav aria-label="Mobile">
          <ul className="space-y-2">
            {SITE_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block py-2 font-display text-5xl font-light">
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
