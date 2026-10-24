import Image from 'next/image';
import { cn } from '@/lib/utils';

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;

function isOptimisable(src: string) {
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && url.hostname === supabaseHost && url.pathname.startsWith('/storage/v1/object/public/');
  } catch {
    return false;
  }
}

/**
 * Artwork photographs from the archive's Supabase storage, served through the image optimiser. Images hosted
 * anywhere else (for example stock placeholders left in old seed data) are not shown on the public site.
 */
export function ArtworkImage({
  src,
  alt,
  sizes,
  priority,
  className,
  fit = 'cover',
}: {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fit?: 'cover' | 'contain';
}) {
  if (!src || !isOptimisable(src)) {
    return (
      <div
        role="img"
        aria-label={`${alt} (image not available)`}
        className={cn('flex h-full w-full items-center justify-center bg-[#E9E4DD] text-xs uppercase tracking-[0.2em] text-stone', className)}
      >
        Image forthcoming
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn(fit === 'cover' ? 'object-cover' : 'object-contain', className)}
    />
  );
}
