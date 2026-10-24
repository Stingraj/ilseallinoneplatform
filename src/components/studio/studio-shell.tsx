'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type CSSProperties } from 'react';
import { ExternalLink, LogOut, Menu, Plus } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { STUDIO_SECTIONS, findSection } from './sections';

function StudioNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = findSection(pathname);
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="px-5 pb-4 pt-6">
        <Link href="/studio" onClick={onNavigate} className="block">
          <span className="font-studio text-lg font-bold tracking-tight text-slate-900">Artist Studio</span>
          <span className="mt-0.5 block text-xs font-medium text-slate-500">Ilse Sørensen Murdock</span>
        </Link>
      </div>

      <nav aria-label="Studio" className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {STUDIO_SECTIONS.map((section) => {
          const isActive = section.key === active.key;
          const Icon = section.icon;
          return (
            <div key={section.key}>
              <Link
                href={section.href}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-900 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: section.accent }}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {section.name}
              </Link>

              {isActive && section.links && (
                <ul className="mb-2 ml-[1.6rem] mt-1 space-y-0.5 border-l-2 pl-4" style={{ borderColor: section.accent }}>
                  {section.links.map((link) => {
                    const linkActive = pathname === link.href;
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={onNavigate}
                          aria-current={linkActive ? 'page' : undefined}
                          className={cn(
                            'block rounded-md px-2 py-1.5 text-[13px] transition-colors',
                            linkActive ? 'font-semibold text-slate-900' : 'text-slate-500 hover:text-slate-900'
                          )}
                        >
                          {link.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-slate-100 p-4">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        >
          <ExternalLink className="h-4 w-4" aria-hidden /> View website
        </Link>
        {user?.email && <p className="truncate px-2 text-xs text-slate-400">{user.email}</p>}
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-slate-600">
          <LogOut className="mr-2 h-4 w-4" aria-hidden /> Sign out
        </Button>
      </div>
    </div>
  );
}

export function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const section = findSection(pathname);
  const subLink = section.links?.find((link) => link.href === pathname);
  const [open, setOpen] = useState(false);

  return (
    <div className="studio min-h-screen" style={{ '--section-accent': section.accent } as CSSProperties}>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200/70 lg:block">
        <StudioNav />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur">
          <div className="h-1 w-full" style={{ backgroundColor: section.accent }} aria-hidden />
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-10">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Studio navigation</SheetTitle>
                <StudioNav onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>

            <nav aria-label="Breadcrumb" className="min-w-0 flex-1 text-sm">
              <ol className="flex items-center gap-2 truncate">
                <li className="font-semibold text-slate-900">{section.name}</li>
                {subLink && subLink.href !== section.href && (
                  <>
                    <li className="text-slate-300" aria-hidden>
                      /
                    </li>
                    <li className="truncate text-slate-500">{subLink.name}</li>
                  </>
                )}
              </ol>
            </nav>

            <Button asChild size="sm" className="rounded-full bg-slate-900 text-white hover:bg-slate-800">
              <Link href="/studio/archive/new">
                <Plus className="mr-1 h-4 w-4" aria-hidden /> Add artwork
              </Link>
            </Button>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
