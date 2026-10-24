'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useState, useSyncExternalStore, type ReactNode } from 'react';
import { detectCapability, type Capability } from '@/lib/gallery/tier';
import type { GalleryPlan } from '@/lib/gallery/plan';

// The 3D code (three.js and the scene) is only downloaded on devices that will actually use it.
const Walkthrough = dynamic(() => import('./Walkthrough'), { ssr: false });

let cached: Capability | null = null;
const noop = () => () => {};
const readCapability = () => (cached ??= detectCapability());

interface Props {
  plan: GalleryPlan;
  /** Server-rendered 2D gallery, grouped by room. */
  fallback: ReactNode;
  /** Server-rendered text-only list for screen readers while the 3D view is open. */
  textIndex: ReactNode;
  notice?: string | null;
}

export function GalleryWalk({ plan, fallback, textIndex, notice }: Props) {
  const capability = useSyncExternalStore(noop, readCapability, () => null);
  const [override, setOverride] = useState<'3d' | '2d' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fatal = useCallback((reason: string) => {
    setMessage(reason);
    setOverride('2d');
  }, []);

  const usable = capability !== null && capability.webgl && plan.artworks.length > 0;
  const preferred: '3d' | '2d' = usable && capability.tier !== 'low' ? '3d' : '2d';
  const view = capability === null ? 'checking' : (override ?? preferred);

  if (view === 'checking') {
    return (
      <>
        <div className="gw-loading fixed inset-0 z-[60] flex items-center justify-center bg-ink text-paper">
          <p className="font-display text-3xl italic">Opening the gallery…</p>
        </div>
        <noscript>
          <style>{'.gw-loading{display:none}'}</style>
          <div className="site-container pb-24 pt-32">{fallback}</div>
        </noscript>
      </>
    );
  }

  if (view === '3d' && capability) {
    return (
      <>
        <Walkthrough
          plan={plan}
          tier={capability.tier === 'none' ? 'low' : capability.tier}
          reducedMotion={capability.reducedMotion}
          touch={capability.touch}
          onFatal={fatal}
          onExit2D={() => {
            setMessage(null);
            setOverride('2d');
          }}
        />
        <div className="sr-only">{textIndex}</div>
      </>
    );
  }

  const why = message ?? capability?.reason ?? (plan.artworks.length === 0 ? 'The works are being prepared for the 3D gallery.' : null);
  return (
    <div className="site-container pb-28 pt-32 sm:pt-40">
      <p className="eyebrow">Gallery Walk</p>
      <h1 className="display-xl mt-4">The works, by room</h1>
      {notice && <p className="mt-6 border border-signal/40 bg-signal/5 px-4 py-3 text-sm text-signal">{notice}</p>}
      {why && <p className="mt-6 max-w-xl text-[15px] leading-7 text-ink/80">{why}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        {capability?.webgl && plan.artworks.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setOverride('3d');
            }}
            className="inline-flex h-12 items-center bg-ink px-8 text-[12px] font-medium uppercase tracking-[0.22em] text-paper hover:bg-ink/85"
          >
            {message ? 'Try the 3D gallery again' : 'Walk the 3D gallery'}
          </button>
        )}
        <Link href="/artworks" className="inline-flex h-12 items-center border border-ink/30 px-8 text-[12px] font-medium uppercase tracking-[0.22em] hover:border-ink">
          Search all works
        </Link>
      </div>
      <div className="mt-16">{fallback}</div>
    </div>
  );
}
