import { Download, FileText } from 'lucide-react';
import { EmptyState } from '@/components/studio/empty-state';
import { PageHeader } from '@/components/studio/page-header';
import { SetupNotice } from '@/components/studio/setup-notice';
import { formatCurrency } from '@/lib/catalog';
import { MIGRATION_HINT, isMissingSchema, requireOwnerPage } from '@/lib/studio/data';
import { InvoiceStatus } from './invoice-status';
import { NewInvoiceForm } from './new-invoice-form';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const supabase = await requireOwnerPage();
  const [invoices, sales, contacts] = await Promise.all([
    supabase.from('invoices').select('id, invoice_number, amount, currency, issue_date, due_date, status, buyer').order('issue_date', { ascending: false }),
    supabase.from('sales').select('id, sale_price, sale_date, buyer_name, contact_id, artworks(title)').order('sale_date', { ascending: false }),
    supabase.from('contacts').select('id, name').order('name'),
  ]);
  const schemaMissing = isMissingSchema(invoices.error);

  const saleOptions = (sales.data ?? []).map((sale) => {
    const artwork = Array.isArray(sale.artworks) ? sale.artworks[0] : sale.artworks;
    return {
      id: sale.id,
      contactId: sale.contact_id,
      label: [artwork?.title ?? 'Artwork', sale.buyer_name, sale.sale_date, sale.sale_price ? formatCurrency(Number(sale.sale_price), 'USD') : null].filter(Boolean).join(' · '),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Professional PDF invoices generated from your recorded sales." />
      {schemaMissing && <SetupNotice title="Invoices need the database update">{MIGRATION_HINT}</SetupNotice>}

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="studio-card p-6 xl:col-span-2" aria-labelledby="new-invoice">
          <h2 id="new-invoice" className="mb-5 font-studio text-lg font-semibold">New invoice</h2>
          {schemaMissing ? <p className="text-sm text-slate-500">Available after the database update.</p> : <NewInvoiceForm sales={saleOptions} contacts={contacts.data ?? []} />}
        </section>

        <section className="xl:col-span-3" aria-labelledby="invoice-list">
          <h2 id="invoice-list" className="sr-only">Invoices</h2>
          {(invoices.data ?? []).length === 0 ? (
            <EmptyState icon={FileText} title="No invoices yet">Create one from a recorded sale.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {(invoices.data ?? []).map((invoice) => (
                <li key={invoice.id} className="studio-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{invoice.invoice_number}</p>
                    <p className="text-xs text-slate-400">
                      {(invoice.buyer as { name?: string } | null)?.name ?? '—'} · issued {invoice.issue_date}
                      {invoice.due_date && ` · due ${invoice.due_date}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-studio font-semibold">{formatCurrency(Number(invoice.amount), invoice.currency ?? 'USD')}</span>
                    <InvoiceStatus id={invoice.id} value={invoice.status} />
                    <a href={`/api/studio/invoices/${invoice.id}/pdf`} className="inline-flex h-8 items-center gap-1 rounded-full bg-[#E3F7EE] px-3 text-xs font-semibold text-slate-800">
                      <Download className="h-3.5 w-3.5" aria-hidden /> PDF
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
