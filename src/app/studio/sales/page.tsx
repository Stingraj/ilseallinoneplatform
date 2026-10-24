'use client';

import { FormEvent, Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronsUpDown, DollarSign, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Artwork, Sale } from '@/lib/types/database';
import { formatCurrency, getArtworkInventoryNumber } from '@/lib/catalog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { addSaleAction, deleteSaleAction, updateSaleAction } from '@/app/actions/db';
import { cn } from '@/lib/utils';

type SaleForm = {
  artwork_id: string;
  sale_date: string;
  buyer_name: string;
  sale_price: string;
  commission_percentage: string;
  discount: string;
  notes: string;
};

type YearSummary = {
  year: string;
  sales: Sale[];
  totalPrice: number;
};

function calculateTotalRevenue(sale: Sale) {
  const price = Number(sale.sale_price ?? 0) || 0;
  const discountPercent = Number(sale.discount ?? 0) || 0;
  const commissionPercent = Number(sale.commission_percentage ?? 0) || 0;
  
  const discountedPrice = price * (1 - discountPercent / 100);
  const commissionAmount = discountedPrice * (commissionPercent / 100);
  return discountedPrice - commissionAmount;
}

function formatArtworkOptionLabel(artwork: Pick<Artwork, 'title' | 'inventory_number' | 'year'>) {
  const inventoryNumber = getArtworkInventoryNumber(artwork);
  const year = artwork.year ? String(artwork.year) : '';
  const parts = [inventoryNumber, artwork.title, year].filter(Boolean);
  return parts.join(' - ');
}

function ArtworkCombobox({
  artworks,
  value,
  onValueChange,
}: {
  artworks: Artwork[];
  value: string;
  onValueChange: (artworkId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedArtwork = useMemo(
    () => artworks.find((artwork) => artwork.id === value) ?? null,
    [artworks, value]
  );

  const filteredArtworks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return artworks;

    return artworks.filter((artwork) => {
      const haystack = [
        artwork.title,
        artwork.year ? String(artwork.year) : '',
        getArtworkInventoryNumber(artwork) || '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [artworks, query]);

  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) setQuery('');
    }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate text-left">
            {selectedArtwork ? formatArtworkOptionLabel(selectedArtwork) : 'Select artwork'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search artwork..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No artworks found.</CommandEmpty>
            <CommandGroup>
              {filteredArtworks.map((artwork) => {
                const inventoryNumber = getArtworkInventoryNumber(artwork);
                return (
                  <CommandItem
                    key={artwork.id}
                    value={artwork.id}
                    onSelect={() => {
                      onValueChange(artwork.id);
                      setOpen(false);
                      setQuery('');
                    }}
                    className="items-start gap-2 py-2.5"
                  >
                    <Check
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        value === artwork.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm text-slate-900">{artwork.title}</div>
                      <div className="text-xs text-slate-500">
                        {[inventoryNumber, artwork.year ? String(artwork.year) : ''].filter(Boolean).join(' - ') || 'Untitled record'}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const emptyForm = (): SaleForm => ({
  artwork_id: '',
  sale_date: new Date().toISOString().slice(0, 10),
  buyer_name: '',
  sale_price: '',
  commission_percentage: '',
  discount: '',
  notes: '',
});

export default function SalesTrackerPage() {
  const supabase = useMemo(() => createClient(), []);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [formData, setFormData] = useState<SaleForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editData, setEditData] = useState<SaleForm>(emptyForm());

  const loadSales = useCallback(async () => {
    setLoading(true);
    const [{ data: artworkRows, error: artworkError }, { data: saleRows, error: saleError }] = await Promise.all([
      supabase.from('artworks').select('id,title,inventory_number,image_url,year,status,sale_price,price,currency,created_at').order('title'),
      supabase.from('sales').select('*, artworks(id,title,inventory_number,image_url,year)').order('sale_date', { ascending: false, nullsFirst: false }),
    ]);

    if (artworkError || saleError) {
      toast.error(artworkError?.message || saleError?.message || 'Failed to load sales');
    }

    setArtworks((artworkRows ?? []) as Artwork[]);
    setSales((saleRows ?? []) as Sale[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const summaries = useMemo(() => Object.values(sales.reduce<Record<string, YearSummary>>((groups, sale) => {
    const year = sale.sale_date?.slice(0, 4) || 'Undated';
    const current = groups[year] ?? { year, sales: [], totalPrice: 0 };

    current.sales.push(sale);
    current.totalPrice += Number(sale.sale_price ?? 0) || 0;
    groups[year] = current;
    return groups;
  }, {})).sort((a, b) => b.year.localeCompare(a.year)), [sales]);

  function parseForm(data: SaleForm) {
    return {
      ...data,
      sale_price: Number(data.sale_price),
      commission_percentage: Number(data.commission_percentage || 0),
      discount: Number(data.discount || 0),
    };
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const data = parseForm(formData);
    if (!data.artwork_id || !data.sale_date || Number.isNaN(data.sale_price)) {
      toast.error('Artwork, date sold, and sale price are required');
      return;
    }

    setSaving(true);
    const result = await addSaleAction(data);
    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success('Sale recorded');
      setFormData(emptyForm());
      await loadSales();
    }
    setSaving(false);
  }

  function startEditing(sale: Sale) {
    setEditingSaleId(sale.id);
    setEditData({
      artwork_id: sale.artwork_id || '',
      sale_date: sale.sale_date || '',
      buyer_name: sale.buyer_name || '',
      sale_price: String(sale.sale_price ?? ''),
      commission_percentage: String(sale.commission_percentage ?? 0),
      discount: String(sale.discount ?? 0),
      notes: sale.notes || '',
    });
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingSaleId) return;

    const data = parseForm(editData);
    if (!data.artwork_id || !data.sale_date || Number.isNaN(data.sale_price)) {
      toast.error('Artwork, date sold, and sale price are required');
      return;
    }

    const result = await updateSaleAction({ id: editingSaleId, ...data });
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Sale updated');
    setEditingSaleId(null);
    await loadSales();
  }

  async function removeSale(id: string) {
    const result = await deleteSaleAction(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Sale removed');
    await loadSales();
  }

  const formFields = (data: SaleForm, update: (next: SaleForm) => void) => (
    <>
      <div className="space-y-2">
        <Label>Artwork</Label>
        <ArtworkCombobox
          artworks={artworks}
          value={data.artwork_id}
          onValueChange={(artwork_id) => update({ ...data, artwork_id })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Date Sold</Label>
          <Input type="date" value={data.sale_date} onChange={(event) => update({ ...data, sale_date: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Price</Label>
          <Input type="number" min="0" step="0.01" value={data.sale_price} onChange={(event) => update({ ...data, sale_price: event.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Commission %</Label>
          <Input type="number" min="0" step="0.01" value={data.commission_percentage} onChange={(event) => update({ ...data, commission_percentage: event.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Discount %</Label>
          <Input type="number" min="0" step="0.01" value={data.discount} onChange={(event) => update({ ...data, discount: event.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Buyer</Label>
        <Input value={data.buyer_name} onChange={(event) => update({ ...data, buyer_name: event.target.value })} />
      </div>
    </>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-24">
      <div className="border-b border-slate-100 pb-6">
        <h1 className="flex items-center gap-3 text-3xl font-semibold text-slate-900"><Receipt className="h-8 w-8" />Sales Reporting</h1>
        <p className="mt-1 text-sm text-slate-500">Yearly sales totals with expandable, editable sale records.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="border border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4" />Record Sale</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              {formFields(formData, setFormData)}
              <Button type="submit" disabled={saving} className="w-full bg-slate-900 text-white">
                <DollarSign className="mr-2 h-4 w-4" />
                {saving ? 'Recording...' : 'Record Sale'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Yearly Summary</h2>

          {loading ? (
            <div className="py-20 text-center text-sm text-slate-500">Loading sales...</div>
          ) : summaries.length === 0 ? (
            <div className="rounded-xl border border-slate-100 bg-white py-20 text-center text-sm text-slate-500">
              No sales recorded yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-[10px] uppercase tracking-wide text-slate-500">
                <span>Year</span>
                <span className="text-right">Total Price</span>
              </div>

              {summaries.map((summary, index) => (
                <div key={summary.year} className={index === 0 ? '' : 'border-t border-slate-100'}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm hover:bg-slate-50"
                    onClick={() => setExpandedYear(expandedYear === summary.year ? null : summary.year)}
                  >
                    <span className="font-semibold text-slate-900">
                      {summary.year} ({summary.sales.length} sold)
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-semibold text-slate-900">{formatCurrency(summary.totalPrice)}</span>
                      <ChevronDown className={expandedYear === summary.year ? 'h-4 w-4 rotate-180 transition-transform' : 'h-4 w-4 transition-transform'} />
                    </span>
                  </button>

                  {expandedYear === summary.year && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                      <div className="overflow-x-auto">
                        <table className="min-w-[760px] w-full text-sm">
                          <thead className="text-left text-[10px] uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="py-2 pr-3">Image</th>
                              <th className="py-2 pr-3">Name</th>
                              <th className="py-2 pr-3">Date</th>
                              <th className="py-2 pr-3">Price</th>
                              <th className="py-2 pr-3">Buyer</th>
                              <th className="py-2 pr-3">Discount</th>
                              <th className="py-2 pr-3">Commission</th>
                              <th className="py-2 pr-3">Total Revenue</th>
                              <th className="py-2 pr-3" />
                            </tr>
                          </thead>
                          <tbody>
                            {summary.sales.map((sale) => (
                              <Fragment key={sale.id}>
                                <tr className="border-t border-slate-100">
                                  <td className="py-3 pr-3">
                                    {sale.artworks?.image_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={sale.artworks.image_url} alt="" className="h-9 w-9 rounded object-cover" />
                                    ) : (
                                      <div className="h-9 w-9 rounded bg-slate-200" />
                                    )}
                                  </td>
                                  <td className="py-3 pr-3">{sale.artworks?.title || 'Artwork removed'}</td>
                                  <td className="py-3 pr-3">{sale.sale_date}</td>
                                  <td className="py-3 pr-3">{formatCurrency(sale.sale_price)}</td>
                                  <td className="py-3 pr-3">{sale.buyer_name || '-'}</td>
                                  <td className="py-3 pr-3">{Number(sale.discount ?? 0)}%</td>
                                  <td className="py-3 pr-3">{Number(sale.commission_percentage ?? 0)}%</td>
                                  <td className="py-3 pr-3 font-semibold">{formatCurrency(calculateTotalRevenue(sale))}</td>
                                  <td className="py-3 pr-3 whitespace-nowrap">
                                    <Button variant="ghost" size="icon" onClick={() => startEditing(sale)}><Pencil className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="text-red-600" onClick={() => removeSale(sale.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                  </td>
                                </tr>

                                {editingSaleId === sale.id && (
                                  <tr>
                                    <td colSpan={9} className="border-t border-slate-100 p-4">
                                      <form onSubmit={saveEdit} className="grid gap-3 md:grid-cols-2">
                                        {formFields(editData, setEditData)}
                                        <div className="col-span-full flex justify-end gap-2">
                                          <Button type="button" variant="outline" onClick={() => setEditingSaleId(null)}>Cancel</Button>
                                          <Button type="submit">Save changes</Button>
                                        </div>
                                      </form>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
