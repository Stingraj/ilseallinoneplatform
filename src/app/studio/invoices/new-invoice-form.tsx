'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createInvoiceFromSaleAction } from './actions';

export interface SaleOption { id: string; label: string; contactId: string | null }
export interface ContactOption { id: string; name: string }

const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

export function NewInvoiceForm({ sales, contacts }: { sales: SaleOption[]; contacts: ContactOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saleId, setSaleId] = useState(sales[0]?.id ?? '');
  const sale = sales.find((s) => s.id === saleId);

  if (sales.length === 0) {
    return <p className="text-sm text-slate-500">Record a sale in the Sales tracker first. Invoices are created from real sales, never typed in twice.</p>;
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await createInvoiceFromSaleAction(formData);
          if (!result.success) return void toast.error(result.error ?? 'Could not create the invoice');
          toast.success('Invoice created');
          router.refresh();
        })
      }
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="inv-sale">Sale</Label>
        <select id="inv-sale" name="sale_id" value={saleId} onChange={(e) => setSaleId(e.target.value)} className={selectClass}>
          {sales.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="inv-contact">Bill to (collector)</Label>
        <select id="inv-contact" name="contact_id" defaultValue={sale?.contactId ?? ''} key={saleId} className={selectClass}>
          <option value="">Use the buyer name on the sale</option>
          {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="inv-tax-label">Tax name (optional)</Label>
        <Input id="inv-tax-label" name="tax_label" placeholder="e.g. VAT" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="inv-tax-rate">Tax rate %</Label>
        <Input id="inv-tax-rate" name="tax_rate" type="number" min={0} max={100} step="0.01" defaultValue={0} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="inv-due">Due date</Label>
        <Input id="inv-due" name="due_date" type="date" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="inv-notes">Notes (payment details, terms)</Label>
        <Textarea id="inv-notes" name="notes" rows={3} />
      </div>
      <p className="text-xs text-slate-500 sm:col-span-2">Tax is never added automatically. Check the rules for your country and the buyer&apos;s before entering a rate.</p>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending} className="bg-slate-900 text-white">{pending ? 'Creating…' : 'Create invoice'}</Button>
      </div>
    </form>
  );
}
