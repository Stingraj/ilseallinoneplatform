'use client';

import { useEffect, useRef, useState } from 'react';
import { ArtworkImage } from './artwork-image';

/** Click the artwork to see it full screen. Keyboard: Enter/Space opens, Escape closes; focus returns to the trigger. */
export function ArtworkLightbox({ src, alt }: { src: string | null; alt: string }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => src && setOpen(true)}
        className="group relative block h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        aria-label={`View ${alt} full screen`}
        disabled={!src}
      >
        <ArtworkImage src={src} alt={alt} sizes="(min-width: 1024px) 60vw, 100vw" priority fit="contain" />
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => event.target === event.currentTarget && setOpen(false)}
        className="m-0 h-[100dvh] max-h-none w-screen max-w-none bg-ink/95 p-0 backdrop:bg-ink/95"
        aria-label={alt}
      >
        {open && (
          <div className="relative h-full w-full p-4 sm:p-10">
            <ArtworkImage src={src} alt={alt} sizes="100vw" fit="contain" />
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 h-11 px-4 text-[12px] uppercase tracking-[0.22em] text-paper"
        >
          Close
        </button>
      </dialog>
    </>
  );
}
