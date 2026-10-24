'use client';

import Link from 'next/link';
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Compass, DoorOpen, Footprints, HelpCircle, LayoutGrid, Maximize2, X } from 'lucide-react';
import { describeStop, introStopFor } from '@/lib/gallery/describe';
import { NavController, type NavMode } from '@/lib/gallery/navigation';
import type { GalleryPlan } from '@/lib/gallery/plan';
import type { Tier } from '@/lib/gallery/tier';
import { formatPrice } from '@/lib/website/mappers';
import { InspectOverlay } from './InspectOverlay';
import Scene, { type InputState } from './Scene';

interface Props {
  plan: GalleryPlan;
  tier: Exclude<Tier, 'none'>;
  reducedMotion: boolean;
  touch: boolean;
  /** Shown to the visitor if the scene cannot continue, then they are moved to the 2D gallery. */
  onFatal: (reason: string) => void;
  onExit2D: () => void;
}

class SceneBoundary extends Component<{ children: ReactNode; onError: (message: string) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError(error.message);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const WHEEL_STEP = 70;
const STEP_COOLDOWN_MS = 650;
const LOST_LIMIT = 3;
const LOST_WINDOW_MS = 120_000;
const RESTORE_TIMEOUT_MS = 6000;

export default function Walkthrough({ plan, tier, reducedMotion, touch, onFatal, onExit2D }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const nav = useMemo(() => new NavController(plan, reducedMotion), [plan, reducedMotion]);
  const input = useRef<InputState>({ forward: 0, strafe: 0, turn: 0, sprint: false });
  const target = useRef(0);
  const lastStep = useRef(0);
  const wheel = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const losses = useRef<number[]>([]);
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [arrived, setArrived] = useState<number | null>(0);
  const [mode, setMode] = useState<NavMode>('guided');
  const [ready, setReady] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [help, setHelp] = useState(false);
  const [rooms, setRooms] = useState(false);
  const [lost, setLost] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [targetStop, setTargetStop] = useState(0);
  const [more, setMore] = useState<number | null>(null);

  const stops = plan.stops;
  const stop = arrived !== null ? stops[arrived] : null;
  const piece = stop?.kind === 'artwork' && stop.artworkIndex !== null ? plan.artworks[stop.artworkIndex] : null;
  const region = stop ? plan.regions[stop.regionIndex] : null;
  const canFree = !(touch && typeof window !== 'undefined' && window.innerWidth < 820);

  // ── navigation ────────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    nav.onArrive = (index) => {
      setArrived(index);
      setAnnouncement(describeStop(plan, plan.stops[index]));
    };
    return () => {
      nav.onArrive = undefined;
    };
  }, [nav, plan]);

  const go = useCallback(
    (index: number) => {
      const next = Math.min(stops.length - 1, Math.max(0, index));
      lastStep.current = performance.now();
      target.current = next;
      setTargetStop(next);
      setMode('guided');
      setRooms(false);
      if (!reducedMotion) setArrived(null);
      nav.goTo(next);
    },
    [nav, stops.length, reducedMotion]
  );

  const step = useCallback(
    (delta: number, force = false) => {
      if (!force && performance.now() - lastStep.current < STEP_COOLDOWN_MS) return;
      const base = nav.mode === 'free' ? nav.nearestStop() : target.current;
      go(base + delta);
    },
    [go, nav]
  );

  const toggleMode = useCallback(() => {
    if (nav.mode === 'guided') {
      if (!canFree) return;
      nav.setMode('free');
      setMode('free');
      setArrived(null);
      setAnnouncement('Free exploration. Use W A S D or the arrow keys to walk, and drag to look around.');
    } else {
      nav.setMode('guided');
      target.current = nav.stopIndex;
      setTargetStop(nav.stopIndex);
      setMode('guided');
      if (!reducedMotion) setArrived(null);
    }
  }, [nav, canFree, reducedMotion]);

  const selectArtwork = useCallback(
    (artworkIndex: number) => {
      const index = stops.findIndex((s) => s.artworkIndex === artworkIndex);
      if (index >= 0) go(index);
    },
    [go, stops]
  );

  const openInspect = useCallback(() => {
    if (piece) setInspect(true);
  }, [piece]);

  // ── keyboard ─────────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const isForm = (el: EventTarget | null) => el instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
    const isButton = (el: EventTarget | null) => el instanceof HTMLElement && ['BUTTON', 'A'].includes(el.tagName);
    const held = new Set<string>();

    const recompute = () => {
      const has = (...keys: string[]) => keys.some((k) => held.has(k));
      input.current.forward = (has('w', 'ArrowUp') ? 1 : 0) - (has('s', 'ArrowDown') ? 1 : 0);
      input.current.strafe = (has('d') ? 1 : 0) - (has('a') ? 1 : 0);
      input.current.turn = (has('q', 'ArrowLeft') ? 1 : 0) - (has('e', 'ArrowRight') ? 1 : 0);
      input.current.sprint = has('Shift');
    };

    const onDown = (event: KeyboardEvent) => {
      if (isForm(event.target) || event.metaKey || event.ctrlKey || event.altKey || inspect) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if (key === 'Escape') {
        if (help) setHelp(false);
        else if (rooms) setRooms(false);
        return;
      }
      if (key === '?' || key === 'h') return void setHelp((value) => !value);
      if (key === 'f') return void toggleMode();
      if (key === 'm') return void setRooms((value) => !value);
      if (key === 'i' || (key === 'Enter' && !isButton(event.target))) {
        if (piece) {
          event.preventDefault();
          openInspect();
        } else if (stop?.kind === 'intro') step(1, true);
        return;
      }

      if (nav.mode === 'free') {
        if (['w', 'a', 's', 'd', 'q', 'e', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift'].includes(key)) {
          event.preventDefault();
          held.add(key);
          recompute();
        }
        return;
      }

      if (['ArrowRight', 'ArrowDown', 'PageDown', 'n'].includes(key) || (key === ' ' && !isButton(event.target))) {
        event.preventDefault();
        step(1);
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'p'].includes(key)) {
        event.preventDefault();
        step(-1);
      } else if (key === 'Home') go(0);
      else if (key === 'End') go(stops.length - 1);
    };
    const onUp = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      held.delete(key);
      recompute();
    };
    const onBlur = () => {
      held.clear();
      recompute();
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [nav, go, step, toggleMode, openInspect, piece, stop, stops.length, help, rooms, inspect]);

  // ── pointer, wheel, touch ─────────────────────────────────────────────────────────────────────────
  const onWheel = (event: React.WheelEvent) => {
    if (nav.mode !== 'guided' || inspect) return;
    wheel.current += event.deltaY;
    if (Math.abs(wheel.current) >= WHEEL_STEP) {
      step(wheel.current > 0 ? 1 : -1);
      wheel.current = 0;
    }
  };
  const onPointerDown = (event: React.PointerEvent) => {
    if (nav.mode === 'free') drag.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag.current || nav.mode !== 'free') return;
    nav.look((event.clientX - drag.current.x) * 0.0042, (event.clientY - drag.current.y) * 0.0034);
    drag.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onTouchStart = (event: React.TouchEvent) => {
    const t = event.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || nav.mode !== 'guided') return;
    const t = event.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dy) > 56 && Math.abs(dy) > Math.abs(dx) * 1.3) step(dy < 0 ? 1 : -1);
    else if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  };

  // ── WebGL context loss ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const onLost = (event: Event) => {
      event.preventDefault(); // allows the browser to restore the context
      const now = Date.now();
      losses.current = [...losses.current.filter((t) => now - t < LOST_WINDOW_MS), now];
      setLost(true);
      if (losses.current.length >= LOST_LIMIT) return onFatal('The graphics card keeps resetting, so the 3D gallery was closed.');
      restoreTimer.current = setTimeout(() => onFatal('The 3D view could not be restored.'), RESTORE_TIMEOUT_MS);
    };
    const onRestored = () => {
      if (restoreTimer.current) clearTimeout(restoreTimer.current);
      // A fresh scene re-uploads every texture; the old library and cache were disposed with the old scene.
      setReady(false);
      setSceneKey((key) => key + 1);
      setLost(false);
    };
    // The events do not bubble, but they can be caught on the way down.
    el.addEventListener('webglcontextlost', onLost, true);
    el.addEventListener('webglcontextrestored', onRestored, true);
    return () => {
      el.removeEventListener('webglcontextlost', onLost, true);
      el.removeEventListener('webglcontextrestored', onRestored, true);
      if (restoreTimer.current) clearTimeout(restoreTimer.current);
    };
  }, [onFatal]);

  // While the gallery is open: no page scroll, and the site header and footer underneath are taken out of the tab
  // order and the accessibility tree so keyboard and screen-reader users stay inside the gallery.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const chrome = Array.from(document.querySelectorAll<HTMLElement>('.site > header, .site > footer'));
    for (const el of chrome) {
      el.setAttribute('inert', '');
      el.setAttribute('aria-hidden', 'true');
    }
    return () => {
      document.body.style.overflow = previous;
      for (const el of chrome) {
        el.removeAttribute('inert');
        el.removeAttribute('aria-hidden');
      }
    };
  }, []);

  const moving = arrived === null && mode === 'guided';
  const atIntro = stop?.kind === 'intro' && mode === 'guided';
  const galleryRegions = plan.regions.filter((r) => r.kind !== 'corridor');
  const progress = stops.length > 1 ? (targetStop / (stops.length - 1)) * 100 : 100;
  const currentRegion = region ?? plan.regions[stops[targetStop]?.regionIndex ?? 0];

  return (
    <div
      ref={container}
      className="fixed inset-0 z-[60] overflow-hidden bg-ink text-paper"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: mode === 'free' ? 'none' : 'pan-x' }}
    >
      <SceneBoundary onError={onFatal}>
        <Scene
          key={sceneKey}
          plan={plan}
          nav={nav}
          input={input}
          tier={tier}
          reducedMotion={reducedMotion}
          focusArtwork={piece?.index ?? null}
          onSelectArtwork={selectArtwork}
          onReady={() => setReady(true)}
        />
      </SceneBoundary>

      {/* cinematic bars while travelling */}
      {!reducedMotion && (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[7vh] origin-top bg-black transition-transform duration-700" style={{ transform: moving ? 'scaleY(1)' : 'scaleY(0)' }} />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[7vh] origin-bottom bg-black transition-transform duration-700" style={{ transform: moving ? 'scaleY(1)' : 'scaleY(0)' }} />
        </>
      )}

      {/* top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 sm:p-5">
        <Link href="/" aria-label="Exit the gallery" className="pointer-events-auto flex h-11 items-center gap-2 bg-ink/55 px-3 text-[11px] uppercase tracking-[0.2em] backdrop-blur hover:bg-paper hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline" aria-hidden>Exit</span>
        </Link>
        <p className="pointer-events-none min-w-0 truncate pt-3 text-center text-[11px] uppercase tracking-[0.28em] text-paper/80">
          {currentRegion.kind === 'foyer' ? plan.artistName : `${currentRegion.roomNumber}/${plan.roomCount} · ${currentRegion.title}`}
        </p>
        <div className="pointer-events-auto flex gap-2">
          <button type="button" onClick={onExit2D} aria-label="Switch to the 2D gallery" className="flex h-11 items-center gap-2 bg-ink/55 px-3 text-[11px] uppercase tracking-[0.2em] backdrop-blur hover:bg-paper hover:text-ink">
            <LayoutGrid className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline" aria-hidden>2D gallery</span>
          </button>
          <button type="button" onClick={() => setHelp(true)} aria-label="Controls and help" className="flex h-11 w-11 items-center justify-center bg-ink/55 backdrop-blur hover:bg-paper hover:text-ink">
            <HelpCircle className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </header>

      {/* room introduction */}
      {atIntro && region && (
        <div
          key={region.id}
          className="pointer-events-none absolute inset-0 z-[5] flex items-end justify-start bg-gradient-to-t from-ink/70 via-transparent to-transparent p-6 pb-32 sm:p-14 sm:pb-36"
        >
          <div className={reducedMotion ? '' : 'animate-fade-up'}>
            <p className="eyebrow text-paper/70">
              {region.kind === 'foyer' ? 'Gallery Walk' : `Room ${region.roomNumber} of ${plan.roomCount}`}
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-[clamp(2.4rem,7vw,6rem)] font-light leading-[0.95]">{region.title}</h1>
            <p className="mt-4 max-w-md text-[15px] leading-6 text-paper/80">
              {region.kind === 'foyer'
                ? plan.roomCount > 0
                  ? `A walk through ${plan.artworks.length} works in ${plan.roomCount} ${plan.roomCount === 1 ? 'room' : 'rooms'}.`
                  : 'New works are being prepared for the gallery.'
                : `${region.subtitle}. ${region.mood}`}
            </p>
            {plan.stops.length > 1 && (
              <p className="mt-6 text-[11px] uppercase tracking-[0.24em] text-paper/60">{touch ? 'Swipe up or tap Next' : 'Scroll or press → to continue'}</p>
            )}
          </div>
        </div>
      )}

      {/* artwork information */}
      {piece && mode === 'guided' && !inspect && (
        <aside
          aria-label="About this work"
          className="absolute inset-x-0 bottom-[4.5rem] z-10 max-h-[40vh] overflow-y-auto bg-paper p-4 text-ink shadow-2xl sm:inset-x-auto sm:bottom-24 sm:left-6 sm:max-h-[60vh] sm:w-[22rem] sm:p-5"
        >
          <p className="eyebrow">
            {region?.title} · {region ? region.artworkIndexes.indexOf(piece.index) + 1 : 1}/{region?.artworkIndexes.length}
          </p>
          <h2 className="mt-2 font-display text-3xl font-light italic leading-tight">{piece.artwork.title}</h2>
          <p className="mt-2 text-sm text-stone">{[piece.artwork.medium, piece.artwork.year].filter(Boolean).join(', ')}</p>
          {piece.artwork.dimensions && <p className="text-sm text-stone">{piece.artwork.dimensions}</p>}
          <p className="mt-3 text-sm">
            {piece.artwork.availability !== 'Available'
              ? piece.artwork.availability
              : piece.artwork.price !== null
                ? formatPrice(piece.artwork.price, piece.artwork.currency)
                : 'Available'}
          </p>
          {piece.artwork.description && (
            <>
              <p className={`mt-4 text-[14px] leading-6 text-ink/80 ${more === piece.index ? '' : 'hidden sm:block'}`}>{piece.artwork.description}</p>
              <button
                type="button"
                onClick={() => setMore(more === piece.index ? null : piece.index)}
                aria-expanded={more === piece.index}
                className="mt-3 text-[11px] uppercase tracking-[0.18em] underline underline-offset-4 sm:hidden"
              >
                {more === piece.index ? 'Less' : 'About this work'}
              </button>
            </>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={openInspect} className="flex h-10 items-center gap-2 bg-ink px-4 text-[11px] uppercase tracking-[0.18em] text-paper hover:bg-ink/85">
              <Maximize2 className="h-3.5 w-3.5" aria-hidden /> Inspect
            </button>
            <Link href={`/artworks/${piece.artwork.slug}#enquire`} className="flex h-10 items-center border border-ink/30 px-4 text-[11px] uppercase tracking-[0.18em] hover:border-ink">
              Enquire
            </Link>
            <Link href={`/artworks/${piece.artwork.slug}`} className="flex h-10 items-center px-2 text-[11px] uppercase tracking-[0.18em] underline underline-offset-4">
              Page
            </Link>
          </div>
        </aside>
      )}

      {/* controls */}
      <nav aria-label="Gallery controls" className="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-5">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <button type="button" onClick={() => step(-1, true)} disabled={mode === 'guided' && targetStop <= 0} aria-label="Previous" className="flex h-12 w-12 shrink-0 items-center justify-center bg-ink/60 backdrop-blur hover:bg-paper hover:text-ink disabled:opacity-30">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <div className="relative h-12 flex-1 bg-ink/60 backdrop-blur">
            <button type="button" onClick={() => setRooms((v) => !v)} aria-expanded={rooms} aria-controls="room-menu" className="flex h-full w-full items-center justify-center gap-2 px-3 text-[11px] uppercase tracking-[0.2em]">
              <DoorOpen className="h-4 w-4" aria-hidden /> Rooms
            </button>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-paper/20" aria-hidden>
              <div className="h-full bg-paper transition-[width] duration-700" style={{ width: `${progress}%` }} />
            </div>
            {rooms && (
              <ul id="room-menu" className="absolute inset-x-0 bottom-14 max-h-[50vh] overflow-y-auto bg-paper p-1 text-ink shadow-2xl">
                {galleryRegions.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => go(introStopFor(plan, r.index))} className="flex w-full items-baseline justify-between gap-4 px-4 py-3 text-left hover:bg-ink hover:text-paper">
                      <span className="font-display text-xl">{r.title}</span>
                      <span className="text-xs text-stone">{r.kind === 'foyer' ? 'Entrance' : r.subtitle}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {canFree && (
            <button type="button" onClick={toggleMode} aria-pressed={mode === 'free'} aria-label="Explore freely" className="flex h-12 shrink-0 items-center gap-2 bg-ink/60 px-3 text-[11px] uppercase tracking-[0.2em] backdrop-blur hover:bg-paper hover:text-ink aria-pressed:bg-paper aria-pressed:text-ink">
              {mode === 'free' ? <Footprints className="h-4 w-4" aria-hidden /> : <Compass className="h-4 w-4" aria-hidden />}
              <span className="hidden sm:inline" aria-hidden>{mode === 'free' ? 'Exploring' : 'Explore'}</span>
            </button>
          )}
          <button type="button" onClick={() => step(1, true)} disabled={mode === 'guided' && targetStop >= stops.length - 1} aria-label="Next" className="flex h-12 w-12 shrink-0 items-center justify-center bg-ink/60 backdrop-blur hover:bg-paper hover:text-ink disabled:opacity-30">
            <ArrowRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {mode === 'free' && (
          <p className="mt-2 text-center text-[11px] uppercase tracking-[0.2em] text-paper/70">
            {touch ? 'Drag to look' : 'W A S D to walk · drag to look · click a work to approach · F for the tour'}
          </p>
        )}
      </nav>

      {/* loading and recovery */}
      {(!ready || lost) && (
        <div role="status" className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-ink text-paper">
          <p className="font-display text-3xl italic">{lost ? 'Restoring the gallery…' : 'Opening the gallery…'}</p>
          <div className="h-px w-40 overflow-hidden bg-paper/20">
            <div className="h-full w-1/3 animate-pulse bg-paper" />
          </div>
        </div>
      )}

      {/* controls help */}
      {help && (
        <div role="dialog" aria-modal="true" aria-label="Controls" className="absolute inset-0 z-30 flex items-center justify-center bg-ink/80 p-4" onClick={() => setHelp(false)}>
          <div className="max-h-full w-full max-w-lg overflow-y-auto bg-paper p-6 text-ink" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 className="font-display text-3xl">Moving through the gallery</h2>
              <button type="button" onClick={() => setHelp(false)} aria-label="Close help" className="flex h-10 w-10 items-center justify-center hover:bg-ink hover:text-paper"><X className="h-4 w-4" /></button>
            </div>
            <dl className="mt-5 grid grid-cols-[auto,1fr] gap-x-6 gap-y-3 text-sm">
              <dt className="font-medium">Scroll · → ↓ · Next</dt><dd>Walk to the next work or room</dd>
              <dt className="font-medium">← ↑ · Previous</dt><dd>Walk back</dd>
              <dt className="font-medium">Click a work</dt><dd>Approach it and read about it</dd>
              <dt className="font-medium">I · Enter</dt><dd>Inspect the work closely: zoom and move</dd>
              <dt className="font-medium">M</dt><dd>Jump to a room</dd>
              <dt className="font-medium">F</dt><dd>Explore freely, then return to the tour</dd>
              <dt className="font-medium">W A S D · Q E</dt><dd>Walk and turn while exploring (Shift runs)</dd>
              <dt className="font-medium">Touch</dt><dd>Swipe up or down to walk, tap a work to approach</dd>
              <dt className="font-medium">Esc</dt><dd>Close a panel</dd>
            </dl>
            <p className="mt-5 text-sm text-stone">Prefer a plain list of the works? Use “2D gallery” at the top.</p>
          </div>
        </div>
      )}

      {inspect && piece && <InspectOverlay artwork={piece.artwork} onClose={() => setInspect(false)} />}

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  );
}
