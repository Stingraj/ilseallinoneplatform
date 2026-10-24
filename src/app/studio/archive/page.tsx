'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Download,
  Layers,
  Rows3,
  Edit2,
  Trash2,
  Archive,
  Eye,
  EyeOff,
  MapPin,
  ChevronDown,
  Receipt,
  Star,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { deleteArtworkAction, setArtworkFeaturedAction, setArtworkPublicPriceVisibilityAction, toggleArchiveArtworkAction } from '@/app/actions/db';
import { PdfPriceSwitch } from '@/components/archive/pdf-price-switch';
import { Artwork, Sale } from '@/lib/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  getDistinctArtworkValues,
  getYearsDescending,
  matchesStatusTab,
  RAW_STATUS_FILTER_OPTIONS,
  STATUS_TABS,
  formatCurrency,
  getArtworkCollection,
  getArtworkInventoryNumber,
  getArtworkPrice,
  normalizeArtworkStatus,
} from '@/lib/catalog';
import { toast } from 'sonner';

function groupArtworksByYear(artworks: Artwork[]) {
  return artworks.reduce<Record<string, Artwork[]>>((groups, artwork) => {
    const key = artwork.year ? artwork.year.toString() : 'Undated';
    if (!groups[key]) groups[key] = [];
    groups[key].push(artwork);
    return groups;
  }, {});
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

export default function DashboardOverview() {
  const supabase = useMemo(() => createClient(), []);

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusTab, setStatusTab] = useState<'all' | 'Available' | 'Sold' | 'not-for-sale'>('all');
  const [groupByYear, setGroupByYear] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  async function handleToggleArchive(artwork: Artwork) {
    const nextStatus = artwork.status === 'Private' ? 'Available' : 'Private';
    const actionLabel = nextStatus === 'Private' ? 'archived' : 'activated';

    try {
      const result = await toggleArchiveArtworkAction(artwork.id, nextStatus);
      if (!result.success) throw new Error(result.error);

      toast.success(`Artwork status updated to ${nextStatus} (${actionLabel})`);
      setArtworks((current) =>
        current.map((item) =>
          item.id === artwork.id ? { ...item, status: nextStatus } : item
        )
      );
    } catch (error: any) {
      toast.error(`Failed to update artwork status: ${error.message}`);
    }
  }

  async function handlePublicPriceToggle(artwork: Artwork) {
    const isPriceVisible = artwork.is_price_visible === false;
    try {
      const result = await setArtworkPublicPriceVisibilityAction(artwork.id, isPriceVisible);
      if (!result.success) throw new Error(result.error);
      setArtworks((current) => current.map((item) =>
        item.id === artwork.id ? { ...item, is_price_visible: isPriceVisible } : item
      ));
      toast.success(isPriceVisible ? 'Price is now visible on the public site' : 'Price is now hidden on the public site');
    } catch (error: any) {
      toast.error(`Could not update public price: ${error.message}`);
    }
  }

  const featuredCount = artworks.filter((artwork) => artwork.is_featured).length;

  async function handleFeaturedToggle(artwork: Artwork) {
    const isFeatured = !artwork.is_featured;
    if (isFeatured && featuredCount >= 10) {
      toast.error('10/10 featured artworks selected. Unfeature one first.');
      return;
    }
    const result = await setArtworkFeaturedAction(artwork.id, isFeatured);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setArtworks((current) => current.map((item) => item.id === artwork.id ? { ...item, is_featured: isFeatured } : item));
    toast.success(isFeatured ? 'Artwork featured on the homepage' : 'Artwork removed from the homepage');
  }

  async function handleDelete(id: string) {
    try {
      const result = await deleteArtworkAction(id);
      if (!result.success) throw new Error(result.error);

      toast.success('Artwork deleted successfully');
      setArtworks((current) => current.filter((artwork) => artwork.id !== id));
      setSelectedIds((current) => current.filter((selectedId) => selectedId !== id));
    } catch (error: any) {
      toast.error(`Failed to delete artwork: ${error.message}`);
    } finally {
      setDeleteConfirmId(null);
    }
  }

  function renderTable(artworkList: Artwork[]) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <Table className="min-w-[1080px]">
            <TableHeader className="bg-slate-50/75">
              <TableRow className="hover:bg-transparent border-b border-slate-200">
                <TableHead className="w-[48px] px-4 py-3"></TableHead>
                <TableHead className="w-[80px] py-3 text-slate-700 font-semibold text-[10px] uppercase tracking-wider">Thumbnail</TableHead>
                <TableHead className="w-[110px] py-3 text-slate-700 font-semibold text-[10px] uppercase tracking-wider">Work ID</TableHead>
                <TableHead className="min-w-[150px] py-3 text-slate-700 font-semibold text-[10px] uppercase tracking-wider">Title</TableHead>
                <TableHead className="w-[70px] py-3 text-slate-700 font-semibold text-[10px] uppercase tracking-wider">Year</TableHead>
                <TableHead className="w-[120px] py-3 text-slate-700 font-semibold text-[10px] uppercase tracking-wider">Dimensions</TableHead>
                <TableHead className="min-w-[130px] py-3 text-slate-700 font-semibold text-[10px] uppercase tracking-wider">Medium</TableHead>
                <TableHead className="min-w-[100px] py-3 text-slate-700 font-semibold text-[10px] uppercase tracking-wider">Location</TableHead>
                <TableHead className="w-[110px] py-3 text-slate-700 font-semibold text-[10px] uppercase tracking-wider text-right">Price</TableHead>
                <TableHead className="w-[84px] py-3 text-slate-700 font-semibold text-[10px] uppercase tracking-wider text-center">Site price</TableHead>
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
                    <TableCell onClick={(event) => event.stopPropagation()} className="py-2 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePublicPriceToggle(artwork)}
                        title={artwork.is_price_visible === false ? 'Show price on public site' : 'Hide price on public site'}
                        className={artwork.is_price_visible === false ? 'h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-slate-700' : 'h-8 w-8 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'}
                      >
                        {artwork.is_price_visible === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
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
                          className="h-7 w-7 text-slate-500 hover:text-amber-700 hover:bg-amber-50"
                          title={artwork.status === 'Private' ? 'Activate' : 'Archive'}
                          onClick={() => handleToggleArchive(artwork)}
                        >
                          <Archive className={`h-3.5 w-3.5 ${artwork.status === 'Private' ? 'text-amber-600 fill-amber-50' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={artwork.is_featured ? 'h-7 w-7 text-amber-500 hover:bg-amber-50 hover:text-amber-600' : 'h-7 w-7 text-slate-400 hover:bg-slate-100 hover:text-slate-700'}
                          title={artwork.is_featured ? 'Remove from homepage' : 'Feature on homepage'}
                          onClick={() => handleFeaturedToggle(artwork)}
                        >
                          <Star className={artwork.is_featured ? 'h-3.5 w-3.5 fill-current' : 'h-3.5 w-3.5'} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-red-600 hover:bg-red-55"
                          title="Delete"
                          onClick={() => setDeleteConfirmId(artwork.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

  useEffect(() => {
    let active = true;

    async function loadDashboardData() {
      setLoading(true);
      try {
        const [{ data: artworksData, error: artworksError }, { data: salesData, error: salesError }] = await Promise.all([
          supabase
            .from('artworks')
            .select('*')
            .order('year', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false }),
          supabase
            .from('sales')
            .select('*, artworks(id,title,inventory_number,image_url,year)')
            .order('sale_date', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
        ]);

        if (artworksError) throw artworksError;
        if (salesError) throw salesError;

        if (active) {
          setArtworks((artworksData ?? []) as Artwork[]);
          setSales((salesData ?? []) as Sale[]);
        }
      } catch (error: any) {
        toast.error(`Failed to load dashboard data: ${error.message}`);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      active = false;
    };
  }, [supabase]);

  const getArtworkCollectorInfo = (artworkId: string) => {
    const sale = sales.find((s) => s.artwork_id === artworkId);
    if (sale) {
      return `${sale.buyer_name || 'Anonymous'} — ${formatCurrency(sale.sale_price)}`;
    }
    return '—';
  };

  const uniqueYears = useMemo(() => getYearsDescending(artworks), [artworks]);
  const seriesOptions = useMemo(() => getDistinctArtworkValues(artworks, 'series'), [artworks]);
  const categoryOptions = useMemo(() => getDistinctArtworkValues(artworks, 'category'), [artworks]);

  const filteredArtworks = useMemo(() => {
    return artworks.filter((artwork) => {
      const matchesSearch = artwork.title
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase()) ||
        getArtworkInventoryNumber(artwork).toLowerCase().includes(searchQuery.trim().toLowerCase());
      const matchesYear =
        yearFilter === 'all' || (artwork.year && artwork.year.toString() === yearFilter);
      const matchesSeries = seriesFilter === 'all' || artwork.series === seriesFilter;
      const matchesCategory = categoryFilter === 'all' || artwork.category === categoryFilter;

      return (
        matchesSearch &&
        matchesYear &&
        matchesSeries &&
        matchesCategory
      );
    });
  }, [artworks, searchQuery, yearFilter, seriesFilter, categoryFilter]);

  const groupedArtworks = useMemo(
    () => groupArtworksByYear(filteredArtworks),
    [filteredArtworks]
  );

  const groupKeys = useMemo(() => {
    return Object.keys(groupedArtworks).sort((left, right) => {
      if (left === 'Undated') return 1;
      if (right === 'Undated') return -1;
      return Number(right) - Number(left);
    });
  }, [groupedArtworks]);

  function handleToggleSelect(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  }

  function handleSelectAllVisible() {
    const visibleIds = filteredArtworks.map((artwork) => artwork.id);
    const allVisibleSelected = visibleIds.every((id) => selectedIds.includes(id));

    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)));
      toast.success('Cleared visible selection');
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...visibleIds])));
    toast.success(`Selected ${visibleIds.length} visible works`);
  }

  function handleClearSelection() {
    setSelectedIds([]);
  }

  async function handleGeneratePDF() {
    if (selectedIds.length === 0) return;

    setGenerating(true);
    try {
      const res = await fetch('/api/generate-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkIds: selectedIds }),
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

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-24">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">PDF Generator</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage inventory, organize works, and generate clean catalog PDFs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">{featuredCount}/10 featured</span>
          <PdfPriceSwitch />
          <Link href="/studio/archive/new">
            <Button className="bg-slate-900 text-white hover:bg-slate-800">
              <Plus className="mr-2 h-4 w-4" />
              Add Artwork
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.1fr]">
          <div className="relative col-span-1 md:col-span-3 lg:col-span-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by title"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10 w-full"
            />
          </div>

          <div className="col-span-1 md:col-span-3 lg:col-span-1">
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {uniqueYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <Select value={seriesFilter} onValueChange={setSeriesFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Series" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Series</SelectItem>
                {seriesOptions.map((series) => (
                  <SelectItem key={series} value={series}>
                    {series}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryOptions.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <Button
              type="button"
              variant={groupByYear ? 'default' : 'outline'}
              className={`w-full ${groupByYear ? 'bg-slate-900 text-white hover:bg-slate-800' : ''}`}
              onClick={() => setGroupByYear((current) => !current)}
            >
              <Rows3 className="mr-2 h-4 w-4" />
              Group by Year
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAllVisible}>
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedIds.length === 0}
              onClick={handleClearSelection}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
        </div>
      ) : filteredArtworks.length === 0 ? (
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-100 bg-white py-24 text-center shadow-sm">
          <Layers className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-800">No artworks found</h3>
          <p className="mt-2 text-sm text-slate-400">
            Try adjusting the title, year, status, series, or category filters.
          </p>
        </div>
      ) : groupByYear ? (
        <div className="space-y-12">
          {groupKeys.map((yearKey) => (
            <section key={yearKey} className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-xl font-bold text-slate-900">{yearKey}</h2>
              </div>
              {renderTable(groupedArtworks[yearKey])}
            </section>
          ))}
        </div>
      ) : (
        renderTable(filteredArtworks)
      )}

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex w-[90%] max-w-xl -translate-x-1/2 items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white/90 px-6 py-3.5 shadow-xl backdrop-blur-md">
          <span className="text-sm font-semibold text-slate-800">
            {selectedIds.length} works selected
          </span>
          <Button
            size="sm"
            onClick={handleGeneratePDF}
            disabled={generating}
            className="bg-slate-900 text-white hover:bg-slate-800"
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
                    {getArtworkCollection(selectedArtwork) && (
                      <div className="pb-2">
                        <p className="font-semibold uppercase tracking-wider text-slate-400">Collection</p>
                        <p className="mt-1 text-slate-600 font-medium">
                          {getArtworkCollection(selectedArtwork)}
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
                  <Link href={`/studio/archive/${selectedArtwork.id}`}>
                    <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800">
                      <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                      Edit Artwork
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-md bg-white border-slate-200 p-6 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 text-lg font-bold">Delete Artwork</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 mt-2">
            Are you sure you want to permanently delete this artwork? This action cannot be undone and will remove the artwork and its files from database and storage.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
              className="text-slate-700 border-slate-200"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Confirm Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sales Tracker Section */}
      <div className="space-y-6 pt-12 border-t border-slate-100">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-slate-900">
            <Receipt className="h-6 w-6 text-slate-700" />
            Recent Sales
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Private log of collector acquisitions and sold works.
          </p>
        </div>

        {sales.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">No sales recorded yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sales.map((sale) => (
              <article
                key={sale.id}
                className="grid gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-[72px_minmax(0,1fr)_auto] items-center"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("Clicked sale artwork image URL:", sale.artworks?.image_url);
                    if (sale.artworks?.image_url) {
                      setPreviewImage(sale.artworks.image_url);
                    } else {
                      toast.error("Image not available");
                    }
                  }}
                  className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50 flex-shrink-0 hover:opacity-90 ${
                    sale.artworks?.image_url ? 'cursor-pointer' : ''
                  }`}
                >
                  {sale.artworks?.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sale.artworks.image_url}
                      alt={sale.artworks.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">N/A</span>
                  )}
                </button>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {sale.artworks?.title || 'Unknown Artwork'}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    {sale.artworks?.inventory_number && (
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-150">
                        {sale.artworks.inventory_number}
                      </span>
                    )}
                    <span>Collector: {sale.buyer_name || 'Anonymous'}</span>
                    <span>Date: {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-1.5 text-left sm:items-end sm:text-right">
                  <p className="text-lg font-semibold text-slate-900">
                    {formatCurrency(sale.sale_price)}
                  </p>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                    SOLD
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

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
