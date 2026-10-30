'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Artwork image that falls back to a neutral icon when there is no URL or the image cannot load. */
export function ArtworkThumb({ src, className }: { src: string | null | undefined; className?: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // A server-rendered image can fail before hydration attaches onError, so check its state once mounted.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);
  if (!src || failed) {
    return (
      <span className="flex h-full w-full items-center justify-center text-[color:var(--studio-muted)]" title={src ? 'Image could not be loaded' : 'No image'}>
        <ImageIcon className="h-5 w-5" aria-hidden />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={src} alt="" onError={() => setFailed(true)} className={cn('h-full w-full object-contain', className)} />;
}
