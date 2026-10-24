'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, FileDown, Layers, MapPin, X, Eye, Edit2, Star, Plus } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Artwork } from '@/lib/types/database';
import { Button } from '@/components/ui/button';
import { PdfPriceSwitch } from '@/components/archive/pdf-price-switch';
import { setArtworkFeaturedAction } from '@/app/actions/db';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CATALOG_SETTINGS_STORAGE_KEY,
  DEFAULT_CATALOG_SETTINGS,
  PDF_SORT_OPTIONS,
  CatalogSortOrder,
  CatalogSettings,
  formatCurrency,
  getArtworkInventoryNumber,
  getArtworkPrice,
  normalizeArtworkStatus,
} from '@/lib/catalog';
import { toast } from 'sonner';

function sortArtworks(artworks: Artwork[], sortOrder: CatalogSortOrder) {
  const next = [...artworks];
  if (sortOrder === 'newest') {
    return next.sort((left, right) => (right.year || 0) - (left.year || 0));
  }
  if (sortOrder === 'oldest') {
    return next.sort((left, right) => (left.year || 0) - (right.year || 0));
  }
  if (sortOrder === 'title') {
    return next.sort((left, right) => left.title.localeCompare(right.title));
  }
  return next;
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

export default function CatalogAdminPage() {
  const supabase = useMemo(() => createClient(), []);

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [settings, setSettings] = useState<CatalogSettings>(DEFAULT_CATALOG_SETTINGS);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadArtworks() {
      setLoading(true);
      try {
        const { data: artworksData, error: artworksError } = await supabase
          .from('artworks')
          .select('*')
          .order('year', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });

        if (artworksError) throw artworksError;

        if (active) {
          setArtworks((artworksData ?? []) as Artwork[]);
        }
      } catch (error: any) {
        toast.error(`Failed to load artworks: ${error.message}`);
      } finally {
        if (active) setLoading(false);
      }
    }

    const saved = localStorage.getItem(CATALOG_SETTINGS_STORAGE_KEY);
    if (saved) {
      try {
        setSettings({ ...DEFAULT_CATALOG_SETTINGS, ...JSON.parse(saved) });
      } catch {
        localStorage.removeItem(CATALOG_SETTINGS_STORAGE_KEY);
      }
    }

    loadArtworks();
    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    localStorage.setItem(CATALOG_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const displayArtworks = useMemo(
    () => sortArtworks(artworks, settings.sortOrder),
    [artworks, settings.sortOrder]
  );

  const allSelected = displayArtworks.length > 0 && displayArtworks.every((artwork) => selectedIds.includes(artwork.id));
  const featuredCount = artworks.filter((artwork) => artwork.is_featured).length;

  function handleToggleSelect(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  }

  function handleSelectAllToggle() {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(displayArtworks.map((artwork) => artwork.id));
  }

  async function handleGeneratePDF(ids = selectedIds) {
    if (ids.length === 0) return;

    setGenerating(true);
    try {
      const orderedIds =
        settings.sortOrder === 'custom'
          ? displayArtworks
              .filter((artwork) => ids.includes(artwork.id))
              .map((artwork) => artwork.id)
          : [...ids];

      const res = await fetch('/api/generate-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkIds: orderedIds,
          sortOrder: settings.sortOrder,
          layout: 'table',
        }),
      });

      if (!res.ok) {
        toast.error('Failed to generate PDF');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'available-works.pdf';
      a.click();
      URL.revokeObjectURL(url);
      setSelectedIds([]);
      toast.success('PDF downloaded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  }

  async function handleFeaturedToggle(artwork: Artwork) {
    const isFeatured = !artwork.is_featured;
    if (isFeatured && featuredCount >= 10) {
      toast.error('10/10 featured artworks selected. Unfeature one first.');
      return;
    }
    const result = await setArtworkFeaturedAction(artwork.id, isFeatured);
    if (!result.success) return toast.error(result.error);
    setArtworks((current) => current.map((item) => item.id === artwork.id ? { ...item, is_featured: isFeatured } : item));
    toast.success(isFeatured ? 'Artwork featured on the homepage' : 'Artwork removed from the homepage');
  }

  function renderTable(artworkList: Artwork[]) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <Table className="min-w-[1000px]">
            <TableHeader className="bg-slate-50/75">
              <TableRow className="hover:bg-transparent border-b border-slate-200">
                <TableHead className="w-[48px] px-4 py-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAllToggle}
                    aria-label="Select all artworks"
                  />
                </TableHead>
                <TableHead className="w-[80px] py-3 text-slate-700 font-semibold text-[10px] uppercase tracking-wider">Thumbnail</TableHead>
                <TableHead className="w-[110px] py-3 text-slate-700 font-semibold text-[10px] uppercase tracking-wider">Work ID</TableHead>
                <TableHead className="min-w-[150px] py-3 text-slate-700 font-semibold text-[10px] uppercase tracking-wider">Title</TableHead>
                <TableHead className="w-[70px] py-3 text-slate-700 font-semibold text-[10px] uppercase tracking-wider">Year</TableHead>
                <TableHead className="w-[120px] py-3 text-slate-700 font-semibold text-[10px] uppercase tracking-wider">Dimensions</TableHead>
                <TableHead className="min-w-[130px] py-3 text-slate-700 font-semibold text-[10px] uppercase tracking-wider">Medium</TableHead>
                <TableHead className="min-w-[100px] py-3 text-slate-700 font-semibold text-[10px] uppercase tracking-wider">Location</TableHead>
                <TableHead className="w-[110px] py-3 text-slate-700 font-semibold text-[10px] uppercase tracking-wider text-right">Price</TableHead>
                <TableHead className="w-[120px] py-3 text-slate-700 font-semibold text-[10px] uppercase tracking-wider text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {artworkList.map((artwork) => {
                const isSelected = selectedIds.includes(artwork.id);
                return (
                  <TableRow
                    key={artwork.id}
                    className="hover:bg-slate-50/70 cursor-pointer transition-colors border-b border-slate-100 h-14"
                    onClick={() => setSelectedArtwork(artwork)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()} className="px-4 py-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelect(artwork.id)}
                        aria-label={`Select ${artwork.title}`}
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log("Clicked artwork image URL:", artwork.image_url);
                          if (artwork.image_url) {
                            setPreviewImage(artwork.image_url);
                          } else {
                            toast.error("Image not available");
                          }
                        }}
                        className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center ${
                          artwork.image_url ? 'cursor-pointer hover:opacity-80' : ''
                        }`}
                      >
                        {artwork.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={artwork.image_url}
                            alt={artwork.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] font-semibold text-slate-400">N/A</span>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 py-2">
                      {getArtworkInventoryNumber(artwork) || '—'}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800 max-w-[200px] truncate py-2" title={artwork.title}>
                      {artwork.title}
                    </TableCell>
                    <TableCell className="text-slate-600 font-medium py-2">
                      {artwork.year || '—'}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs truncate max-w-[120px] py-2" title={artwork.dimensions || ''}>
                      {artwork.dimensions || '—'}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs truncate max-w-[130px] py-2" title={artwork.medium || ''}>
                      {artwork.medium || '—'}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs truncate max-w-[120px] py-2" title={artwork.location || artwork.consignment_location || ''}>
                      {artwork.location || artwork.consignment_location || '—'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900 py-2">
                      {formatCurrency(getArtworkPrice(artwork), artwork.currency || undefined) || '—'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} className="text-center py-2">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/studio/archive/${artwork.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100" title="Edit">
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          title="View Details"
                          onClick={() => setSelectedArtwork(artwork)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={artwork.is_featured ? 'h-7 w-7 text-amber-500 hover:bg-amber-50' : 'h-7 w-7 text-slate-400 hover:bg-slate-100'}
                          title={artwork.is_featured ? 'Remove from homepage' : 'Feature on homepage'}
                          onClick={() => handleFeaturedToggle(artwork)}
                        >
                          <Star className={artwork.is_featured ? 'h-3.5 w-3.5 fill-current' : 'h-3.5 w-3.5'} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-24">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-900"><FileDown className="h-8 w-8 text-slate-700" />Complete Catalog</h1>
          <p className="mt-1 text-sm text-slate-500">Select artworks or download the complete catalog PDF.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">{featuredCount}/10 featured</span>
          <PdfPriceSwitch />
          <Link href="/studio/archive/new">
            <Button variant="outline" className="border-slate-200">
              <Plus className="mr-2 h-4 w-4" />
              Add Artwork
            </Button>
          </Link>
          <Button onClick={() => handleGeneratePDF(displayArtworks.map((artwork) => artwork.id))} disabled={generating || displayArtworks.length === 0} className="bg-slate-900 text-white hover:bg-slate-800"><Download className="mr-2 h-4 w-4" />Download all</Button>
        </div>
      </div>

      <section className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
          </div>
        ) : displayArtworks.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white py-24 text-center shadow-sm">
            <Layers className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-800">No artworks found</h3>
            <p className="mt-2 text-sm text-slate-400">Add artworks first to build a catalog.</p>
          </div>
        ) : (
          renderTable(displayArtworks)
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900">Sort order</p>
              <Select
                value={settings.sortOrder}
                onValueChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    sortOrder: value as CatalogSortOrder,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sort order" />
                </SelectTrigger>
                <SelectContent>
                  {PDF_SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
      </section>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex w-[90%] max-w-xl -translate-x-1/2 items-center justify-between gap-4 rounded-2xl bg-slate-900 px-6 py-3 text-white shadow-2xl">
          <span className="text-sm font-medium">
            {selectedIds.length} works selected | Generate PDF
          </span>
          <Button
            size="sm"
            onClick={() => handleGeneratePDF()}
            disabled={generating}
            className="bg-white text-slate-900 hover:bg-slate-100"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {generating ? 'Generating...' : 'Generate PDF'}
          </Button>
        </div>
      )}

      {/* Read-only details Dialog */}
      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-3xl w-[95vw] lg:w-[75vw] bg-white border-slate-200 p-0 overflow-hidden rounded-xl">
          {selectedArtwork && (
            <div className="grid md:grid-cols-2 max-h-[85vh] overflow-y-auto">
              {/* Left Column: Image viewer */}
              <div className="relative bg-slate-50 flex items-center justify-center p-8 border-r border-slate-100 min-h-[300px]">
                {selectedArtwork.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedArtwork.image_url}
                    alt={selectedArtwork.title}
                    className="max-w-full max-h-[50vh] object-contain rounded shadow-sm"
                  />
                ) : (
                  <div className="w-48 h-48 bg-slate-100 flex items-center justify-center rounded border border-slate-200">
                    <span className="text-sm font-semibold text-slate-400">No Image Available</span>
                  </div>
                )}
              </div>

              {/* Right Column: Details */}
              <div className="p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-6">
                  <div className="space-y-2 border-b border-slate-100 pb-4">
                    {getArtworkInventoryNumber(selectedArtwork) && (
                      <p className="text-xs font-mono font-semibold uppercase tracking-wide text-slate-400">
                        {getArtworkInventoryNumber(selectedArtwork)}
                      </p>
                    )}
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                      {selectedArtwork.title}
                    </h2>
                    <p className="text-slate-600 text-sm font-medium">
                      {selectedArtwork.medium} {selectedArtwork.year && `, ${selectedArtwork.year}`}
                    </p>
                    {selectedArtwork.dimensions && (
                      <p className="text-xs text-slate-400">{selectedArtwork.dimensions}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 pt-3">
                      {normalizeArtworkStatus(selectedArtwork.status) !== 'Available' && (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${getStatusBadgeClasses(selectedArtwork.status)}`}>
                          {normalizeArtworkStatus(selectedArtwork.status)}
                        </span>
                      )}
                      {selectedArtwork.price !== null && selectedArtwork.price !== undefined && (
                        <span className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                          Price: {formatCurrency(selectedArtwork.price, selectedArtwork.currency || undefined)}
                        </span>
                      )}
                      {selectedArtwork.sale_price !== null && selectedArtwork.sale_price !== undefined && (
                        <span className="inline-flex items-center rounded-full bg-emerald-700 px-2.5 py-0.5 text-xs font-semibold text-white">
                          Sale Price: {formatCurrency(selectedArtwork.sale_price, selectedArtwork.currency || undefined)}
                        </span>
                      )}
                    </div>

                    {selectedArtwork.on_consignment && selectedArtwork.consignment_location && (
                      <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-amber-700 bg-amber-50 p-2.5 rounded-md border border-amber-100 w-full">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span>Currently on consignment at {selectedArtwork.consignment_location}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 text-xs">
                    {selectedArtwork.location && (
                      <div className="pb-2">
                        <p className="font-semibold uppercase tracking-wider text-slate-400">Location</p>
                        <p className="mt-1 text-slate-600 font-medium">
                          {selectedArtwork.location}
                        </p>
                      </div>
                    )}
                    {(selectedArtwork.series || selectedArtwork.category) && (
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {selectedArtwork.series && (
                          <div>
                            <p className="font-semibold uppercase tracking-wider text-slate-400">Series</p>
                            <p className="mt-0.5 text-slate-700 font-medium">{selectedArtwork.series}</p>
                          </div>
                        )}
                        {selectedArtwork.category && (
                          <div>
                            <p className="font-semibold uppercase tracking-wider text-slate-400">Category</p>
                            <p className="mt-0.5 text-slate-700 font-medium">{selectedArtwork.category}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {selectedArtwork.notes && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="font-semibold uppercase tracking-wider text-slate-400">Notes / Statement</p>
                        <p className="mt-1 whitespace-pre-wrap text-slate-600 leading-relaxed">{selectedArtwork.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedArtwork(null)}
                    className="text-slate-700"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[85vh] cursor-default" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-[90vw] max-h-[85vh] object-contain rounded shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-[10000] rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors border border-white/20 cursor-pointer"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
