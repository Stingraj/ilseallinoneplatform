'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronUp, ExternalLink, LogOut, MoreHorizontal, Plus, Search, Settings } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { MOBILE_TABS, SECTION_GROUPS, STUDIO_SECTIONS, findSection } from './sections';

function initials(email: string | undefined) {
  return (email ?? 'IS').slice(0, 2).toUpperCase();
}

function ProfileMenu({ compact }: { compact?: boolean }) {
  const { user, signOut } = useAuth();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-3 rounded-2xl bg-white/80 p-2 text-left ring-1 ring-[color:var(--studio-line)] hover:bg-white',
            compact && 'w-auto rounded-full p-1'
          )}
          aria-label="Account menu"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2a2522] text-xs font-semibold text-white">{initials(user?.email)}</span>
          {!compact && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Ilse Studio</span>
                <span className="block truncate text-xs text-[color:var(--studio-muted)]">{user?.email ?? 'Signed in'}</span>
              </span>
              <ChevronUp className="h-4 w-4 text-[color:var(--studio-muted)]" aria-hidden />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-[color:var(--studio-muted)]">{user?.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/studio/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><a href="/" target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />View website</a></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SectionLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = findSection(pathname);
  return (
    <nav aria-label="Studio" className="space-y-5">
      {SECTION_GROUPS.map((group) => (
        <div key={group}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--studio-muted)]">{group === 'Main' ? 'Main menu' : group}</p>
          <ul className="space-y-0.5">
            {STUDIO_SECTIONS.filter((s) => s.group === group).map((section) => {
              const isActive = section.key === active.key;
              const Icon = section.icon;
              return (
                <li key={section.key}>
                  <Link href={section.href} onClick={onNavigate} aria-current={isActive ? 'page' : undefined} className="studio-nav-link">
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
                    {section.name}
                  </Link>
                  {isActive && section.links && (
                    <ul className="mb-1 ml-[22px] mt-0.5 space-y-0.5 border-l border-[color:var(--studio-line)] pl-3">
                      {section.links.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            onClick={onNavigate}
                            aria-current={pathname === link.href ? 'page' : undefined}
                            className={cn(
                              'flex min-h-9 items-center rounded-lg px-2 text-[13px]',
                              pathname === link.href ? 'font-semibold text-[color:var(--studio-ink)]' : 'text-[color:var(--studio-muted)] hover:text-[color:var(--studio-ink)]'
                            )}
                          >
                            {link.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  return (
    <form
      role="search"
      className={cn('relative', className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (query.trim()) router.push(`/studio/search?q=${encodeURIComponent(query.trim())}`);
      }}
    >
      <label htmlFor="studio-search" className="sr-only">Search artworks, collectors and exhibitions</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--studio-muted)]" aria-hidden />
      <input
        id="studio-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search artworks, collectors, exhibitions"
        className="h-10 w-full rounded-xl border border-[color:var(--studio-line)] bg-white/90 pl-9 pr-3 text-sm placeholder:text-[color:var(--studio-muted)]"
      />
    </form>
  );
}

export function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const section = findSection(pathname);
  const subLink = section.links?.find((link) => link.href === pathname);
  const [more, setMore] = useState(false);

  return (
    <div className="studio min-h-screen md:p-5 lg:p-7">
      <div className="studio-frame flex min-h-screen md:min-h-[calc(100vh-2.5rem)] md:rounded-[28px] lg:min-h-[calc(100vh-3.5rem)]">
        {/* Sidebar (tablet and up) */}
        <aside className="sticky top-5 hidden h-[calc(100vh-2.5rem)] w-[216px] shrink-0 flex-col overflow-y-auto px-3 py-6 md:flex lg:top-7 lg:h-[calc(100vh-3.5rem)] lg:w-[232px]">
          <Link href="/studio" className="mb-7 flex items-center gap-2.5 px-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2a2522] font-display text-base text-[#f3e6da]" aria-hidden>I</span>
            <span className="text-[15px] font-semibold tracking-tight">Ilse Studio</span>
          </Link>
          <div className="flex-1">
            <SectionLinks />
          </div>
          <div className="mt-6">
            <ProfileMenu />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/60 bg-[color:var(--studio-shell)] px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:px-6 md:pt-6 lg:px-8">
            <Link href="/studio" className="flex items-center gap-2 md:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2a2522] font-display text-base text-[#f3e6da]" aria-hidden>I</span>
              <span className="text-[15px] font-semibold">Ilse Studio</span>
            </Link>
            <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 text-sm md:block">
              <ol className="flex items-center gap-2 truncate text-[color:var(--studio-muted)]">
                <li className="font-medium text-[color:var(--studio-ink)]">{section.name}</li>
                {subLink && subLink.href !== section.href && (
                  <>
                    <li aria-hidden>/</li>
                    <li className="truncate">{subLink.name}</li>
                  </>
                )}
              </ol>
            </nav>
            <SearchBox className="ml-auto hidden w-72 md:block lg:w-80" />
            <Button asChild size="sm" className="hidden h-10 rounded-xl px-4 md:inline-flex">
              <Link href="/studio/archive/new"><Plus className="mr-1 h-4 w-4" aria-hidden />Add artwork</Link>
            </Button>
            <div className="ml-auto md:hidden">
              <ProfileMenu compact />
            </div>
          </header>

          <main className="flex-1 px-4 pb-28 pt-4 md:px-6 md:pb-10 md:pt-2 lg:px-8">
            <SearchBox className="mb-4 md:hidden" />
            {children}
          </main>
        </div>
      </div>

      {/* Phone navigation: three tabs plus More, all from the same registry */}
      <nav aria-label="Studio" className="fixed inset-x-3 bottom-3 z-40 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="flex items-center justify-between gap-1 rounded-full border border-white/70 bg-[color:var(--studio-surface-solid)]/95 p-1.5 shadow-lg">
          {STUDIO_SECTIONS.filter((s) => MOBILE_TABS.includes(s.key)).map((s) => {
            const Icon = s.icon;
            const isActive = s.key === section.key;
            return (
              <li key={s.key} className="flex-1">
                <Link
                  href={s.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn('flex h-11 items-center justify-center gap-1.5 rounded-full text-xs font-medium', isActive ? 'bg-[#202322] text-white' : 'text-[color:var(--studio-muted)]')}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {isActive ? s.short : <span className="sr-only">{s.short}</span>}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <Sheet open={more} onOpenChange={setMore}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className={cn('flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-xs font-medium', !MOBILE_TABS.includes(section.key) ? 'bg-[#202322] text-white' : 'text-[color:var(--studio-muted)]')}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                  More
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="studio max-h-[85vh] overflow-y-auto rounded-t-3xl p-5">
                <SheetTitle className="mb-4 text-base">All sections</SheetTitle>
                <SectionLinks onNavigate={() => setMore(false)} />
              </SheetContent>
            </Sheet>
          </li>
        </ul>
      </nav>
    </div>
  );
}
