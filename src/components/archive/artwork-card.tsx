'use client';

import Link from 'next/link';
import { Check, Edit2, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Artwork } from '@/lib/types/database';
import {
  formatCurrency,
  getArtworkInventoryNumber,
  getArtworkPrice,
  normalizeArtworkStatus,
} from '@/lib/catalog';

interface ArtworkCardProps {
  artwork: Artwork;
  selected: boolean;
  onToggleSelect?: (id: string) => void;
  showEditLink?: boolean;
  showOwnerPrice?: boolean;
}

function getStatusBadgeClasses(status: string) {
  switch (normalizeArtworkStatus(status)) {
    case 'Available':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
    case 'Sold':
      return 'bg-red-50 text-red-700 border border-red-100';
    case 'Private':
      return 'bg-slate-100 text-slate-700 border border-slate-200';
    case 'On Loan':
      return 'bg-amber-50 text-amber-700 border border-amber-100';
    default:
      return 'bg-slate-50 text-slate-600 border border-slate-200';
  }
}

export function ArtworkCard({
  artwork,
  selected,
  onToggleSelect,
  showEditLink = true,
  showOwnerPrice = true,
}: ArtworkCardProps) {
  const handleToggle = () => onToggleSelect?.(artwork.id);
  const inventoryNumber = getArtworkInventoryNumber(artwork);
  const ownerPrice = showOwnerPrice
    ? formatCurrency(getArtworkPrice(artwork), artwork.currency || undefined)
    : '';

  return (
    <Card
      onClick={handleToggle}
      className={`relative overflow-hidden rounded-xl border bg-white transition-all duration-300 hover:shadow-md ${
        onToggleSelect ? 'cursor-pointer group' : 'group'
      } ${selected ? 'border-slate-800 ring-1 ring-slate-800' : 'border-slate-100'}`}
    >
      <div className="relative flex items-center justify-center overflow-hidden border-b border-slate-100">
        {artwork.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artwork.image_url}
            alt={artwork.title}
            style={{
              width: '100%',
              height: '220px',
              objectFit: 'cover',
              borderRadius: '4px',
            }}
            className="transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '220px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f5f5f5',
              color: '#999',
            }}
          >
            NO IMAGE
          </div>
        )}

        {onToggleSelect && (
          <button
            type="button"
            aria-label={selected ? `Unselect ${artwork.title}` : `Select ${artwork.title}`}
            className={`absolute left-3.5 top-3.5 flex h-6 w-6 items-center justify-center rounded-md border transition-all ${
              selected
                ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                : 'border-slate-300 bg-white/80 text-transparent opacity-60 backdrop-blur-sm group-hover:opacity-100'
            }`}
            onClick={(event) => {
              event.stopPropagation();
              handleToggle();
            }}
          >
            <Check className="h-4 w-4" />
          </button>
        )}

        {showEditLink && (
          <Link
            href={`/studio/archive/${artwork.id}`}
            onClick={(event) => event.stopPropagation()}
            className="absolute right-3.5 top-3.5 rounded-md border border-slate-200 bg-white/85 p-2 text-slate-600 opacity-0 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:text-slate-900 group-hover:opacity-100"
            title="Edit artwork"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Link>
        )}

        <div className="absolute bottom-3 right-3">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-sm ${getStatusBadgeClasses(
              artwork.status
            )}`}
          >
            {normalizeArtworkStatus(artwork.status)}
          </span>
        </div>
      </div>

      <CardContent className="p-5">
        <div className="flex flex-col gap-1.5">
          {inventoryNumber && (
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {inventoryNumber}
            </p>
          )}
          <h3 className="line-clamp-1 text-base font-semibold text-slate-800 transition-colors group-hover:text-slate-900">
            {artwork.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <span>{artwork.medium || 'Unknown Medium'}</span>
            <span className="text-slate-300">•</span>
            <span>{artwork.year || 'N/A'}</span>
          </div>
          {artwork.dimensions && (
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{artwork.dimensions}</p>
          )}
          {artwork.series && (
            <p className="text-xs text-slate-500">Series: {artwork.series}</p>
          )}
          {artwork.category && (
            <p className="text-xs text-slate-500">Category: {artwork.category}</p>
          )}
          {ownerPrice && (
            <p className="mt-1 text-sm font-semibold text-slate-900">
              Owner price: {ownerPrice}
            </p>
          )}
          {artwork.on_consignment && artwork.consignment_location && (
            <div className="mt-2 flex w-full items-center gap-1 rounded-md border border-amber-100/50 bg-amber-50/50 p-1.5 text-[11px] font-semibold text-amber-700">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">Consignment: {artwork.consignment_location}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
