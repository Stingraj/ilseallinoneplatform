import Link from 'next/link';
import type { PublicArtwork } from '@/lib/website/types';
import { formatPrice } from '@/lib/website/mappers';
import { cn } from '@/lib/utils';
import { ArtworkImage } from './artwork-image';

export function AvailabilityLabel({ artwork, className }: { artwork: PublicArtwork; className?: string }) {
  if (artwork.availability === 'Available') {
    return (
      <span className={cn('text-stone', className)}>
        {artwork.price !== null ? formatPrice(artwork.price, artwork.currency) : 'Available'}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-stone', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', artwork.availability === 'Sold' ? 'bg-signal' : 'bg-stone')} aria-hidden />
      {artwork.availability}
    </span>
  );
}

export function ArtworkCard({
  artwork,
  aspect = 'portrait',
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  priority,
}: {
  artwork: PublicArtwork;
  aspect?: 'portrait' | 'landscape' | 'square';
  sizes?: string;
  priority?: boolean;
}) {
  const ratio = aspect === 'landscape' ? 'aspect-[4/3]' : aspect === 'square' ? 'aspect-square' : 'aspect-[4/5]';
  return (
    <Link href={`/artworks/${artwork.slug}`} className="group block focus-visible:outline-none">
      <div className={cn('relative overflow-hidden bg-[#E9E4DD]', ratio)}>
        <ArtworkImage
          src={artwork.imageUrl}
          alt={`${artwork.title}${artwork.medium ? `, ${artwork.medium}` : ''}`}
          sizes={sizes}
          priority={priority}
          className="transition-transform [transition-duration:1200ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-0 ring-0 ring-ink/0 transition group-focus-visible:ring-2 group-focus-visible:ring-ink" />
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4 text-sm">
        <div className="min-w-0">
          <h3 className="truncate font-display text-xl italic leading-tight text-ink">{artwork.title}</h3>
          <p className="mt-1 truncate text-stone">
            {[artwork.medium, artwork.year].filter(Boolean).join(', ')}
          </p>
        </div>
        <AvailabilityLabel artwork={artwork} className="shrink-0 text-xs" />
      </div>
    </Link>
  );
}
