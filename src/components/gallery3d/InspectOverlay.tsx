'use client';

import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw, X } from 'lucide-react';
import { textureUrl } from '@/lib/gallery/texture-url';
import type { PublicArtwork } from '@/lib/website/types';

const MIN = 1;
const MAX = 6;

/** Full-resolution view of one work: wheel, pinch or buttons to zoom, drag to move, Escape to close. */
export function InspectOverlay({ artwork, onClose }: { artwork: PublicArtwork; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const src = artwork.imageUrl ? textureUrl(artwork.imageUrl, 2048) : null;

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
    return () => el?.close();
  }, []);

  const clampView = (next: { scale: number; x: number; y: number }) => {
    const rect = stage.current?.getBoundingClientRect();
    const scale = Math.min(MAX, Math.max(MIN, next.scale));
    if (!rect) return { scale, x: 0, y: 0 };
    const limitX = (rect.width * (scale - 1)) / 2;
    const limitY = (rect.height * (scale - 1)) / 2;
    return { scale, x: Math.min(limitX, Math.max(-limitX, next.x)), y: Math.min(limitY, Math.max(-limitY, next.y)) };
  };
  const zoomBy = (factor: number) => setView((v) => clampView({ ...v, scale: v.scale * factor }));

  return (
    <dialog
      ref={dialog}
      // A close event can arrive late (React re-runs effects in development); only act if the dialog really is closed.
      onClose={() => {
        if (!dialog.current?.open) onClose();
      }}
      aria-label={`Inspect ${artwork.title}`}
      className="m-0 h-[100dvh] max-h-none w-screen max-w-none bg-ink p-0 text-paper backdrop:bg-ink"
      onKeyDown={(event) => {
        if (event.key === '+' || event.key === '=') zoomBy(1.3);
        if (event.key === '-') zoomBy(1 / 1.3);
        if (event.key === '0') setView({ scale: 1, x: 0, y: 0 });
        const step = 40;
        if (event.key === 'ArrowLeft') setView((v) => clampView({ ...v, x: v.x + step }));
        if (event.key === 'ArrowRight') setView((v) => clampView({ ...v, x: v.x - step }));
        if (event.key === 'ArrowUp') setView((v) => clampView({ ...v, y: v.y + step }));
        if (event.key === 'ArrowDown') setView((v) => clampView({ ...v, y: v.y - step }));
      }}
    >
      <div
        ref={stage}
        className="absolute inset-0 touch-none select-none overflow-hidden"
        onWheel={(event) => zoomBy(event.deltaY < 0 ? 1.15 : 1 / 1.15)}
        onDoubleClick={() => setView((v) => (v.scale > 1 ? { scale: 1, x: 0, y: 0 } : clampView({ scale: 2.5, x: 0, y: 0 })))}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        }}
        onPointerMove={(event) => {
          const previous = pointers.current.get(event.pointerId);
          if (!previous) return;
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          const points = [...pointers.current.values()];
          if (points.length === 2) {
            const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
            if (pinch.current) zoomBy(distance / pinch.current);
            pinch.current = distance;
          } else {
            setView((v) => clampView({ ...v, x: v.x + event.clientX - previous.x, y: v.y + event.clientY - previous.y }));
          }
        }}
        onPointerUp={(event) => {
          pointers.current.delete(event.pointerId);
          pinch.current = null;
        }}
        onPointerCancel={(event) => {
          pointers.current.delete(event.pointerId);
          pinch.current = null;
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`${artwork.title}${artwork.medium ? `, ${artwork.medium}` : ''}`}
            draggable={false}
            className="absolute inset-0 m-auto max-h-[92%] max-w-[94%] object-contain"
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, cursor: view.scale > 1 ? 'grab' : 'zoom-in' }}
          />
        ) : (
          <p className="absolute inset-0 flex items-center justify-center text-paper/70">No image available</p>
        )}
      </div>

      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 sm:p-6">
        <div className="min-w-0">
          <p className="truncate font-display text-2xl italic">{artwork.title}</p>
          <p className="text-sm text-paper/60">{[artwork.medium, artwork.year, artwork.dimensions].filter(Boolean).join(' · ')}</p>
        </div>
        <button type="button" onClick={onClose} className="flex h-11 items-center gap-2 border border-paper/40 px-4 text-[12px] uppercase tracking-[0.2em] hover:bg-paper hover:text-ink">
          <X className="h-4 w-4" aria-hidden /> Close
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 p-4 sm:p-6" role="group" aria-label="Zoom">
        {[
          { label: 'Zoom out', icon: Minus, action: () => zoomBy(1 / 1.3) },
          { label: 'Reset zoom', icon: RotateCcw, action: () => setView({ scale: 1, x: 0, y: 0 }) },
          { label: 'Zoom in', icon: Plus, action: () => zoomBy(1.3) },
        ].map(({ label, icon: Icon, action }) => (
          <button key={label} type="button" onClick={action} aria-label={label} className="flex h-11 w-11 items-center justify-center border border-paper/40 hover:bg-paper hover:text-ink">
            <Icon className="h-4 w-4" aria-hidden />
          </button>
        ))}
      </div>
    </dialog>
  );
}
