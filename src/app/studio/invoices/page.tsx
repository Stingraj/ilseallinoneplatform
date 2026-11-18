import { Download, FileText } from 'lucide-react';
import { EmptyState } from '@/components/studio/empty-state';
import { PageHeader } from '@/components/studio/page-header';
import { SetupNotice } from '@/components/studio/setup-notice';
import { formatCurrency } from '@/lib/catalog';
import { MIGRATION_HINT, isMissingSchema, requireOwnerPage } from '@/lib/studio/data';
import { InvoiceActions } from './invoice-actions';
import { NewInvoiceForm } from './new-invoice-form';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string | null;
  issue_date: string;
  due_date: string | null;
  status: string;
  buyer: { name?: string } | null;
  kind?: 'invoice' | 'quote';
  valid_until?: string | null;
  paid_at?: string | null;
  invoice_reminders?: { created_at: string; state: string }[];
}

const BASE_COLUMNS = 'id, invoice_number, amount, currency, issue_date, due_date, status, buyer';

export default async function InvoicesPage() {
  const supabase = await requireOwnerPage();
  const [current, sales, contacts] = await Promise.all([
    supabase
      .from('invoices')
      .select(`${BASE_COLUMNS}, kind, valid_until, paid_at, invoice_reminders(created_at, state)`)
      .order('issue_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('sales').select('id, sale_price, sale_date, buyer_name, contact_id, artworks(title)').order('sale_date', { ascending: false }),
    supabase.from('contacts').select('id, name').order('name'),
  ]);

  // Before the quick-wins migration there are no quotes or reminders: read the original columns.
  let invoices = current as { data: Row[] | null; error: { code?: string; message?: string } | null };
  const quickWins = !isMissingSchema(current.error);
  if (!quickWins) {
    invoices = (await supabase.from('invoices').select(BASE_COLUMNS).order('issue_date', { ascending: false })) as typeof invoices;
  }
  const schemaMissing = isMissingSchema(invoices.error);

  const saleOptions = (sales.data ?? []).map((sale) => {
    const artwork = Array.isArray(sale.artworks) ? sale.artworks[0] : sale.artworks;
    return {
      id: sale.id,
      contactId: sale.contact_id,
      label: [artwork?.title ?? 'Artwork', sale.buyer_name, sale.sale_date, sale.sale_price ? formatCurrency(Number(sale.sale_price), 'USD') : null].filter(Boolean).join(' · '),
    };
  });
  const rows = invoices.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices & quotes"
        description="Quotes, invoices and receipts generated from your recorded sales. An accepted quote becomes an invoice in one click; marking an invoice paid marks the sale paid."
      />
      {schemaMissing && <SetupNotice title="Invoices need the database update">{MIGRATION_HINT}</SetupNotice>}
      {!schemaMissing && !quickWins && (
        <SetupNotice title="Quotes, receipts and reminders are waiting for the database update">
          Apply supabase/migrations/20261118000000_studio_quick_wins.sql (staging first). Invoices work as before until then.
        </SetupNotice>
      )}

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="studio-card p-6 xl:col-span-2" aria-labelledby="new-invoice">
          <h2 id="new-invoice" className="mb-5 font-studio text-lg font-semibold">New invoice or quote</h2>
          {schemaMissing ? (
            <p className="text-sm text-slate-500">Available after the database update.</p>
          ) : (
            <NewInvoiceForm sales={saleOptions} contacts={contacts.data ?? []} quotesEnabled={quickWins} />
          )}
        </section>

        <section className="xl:col-span-3" aria-labelledby="invoice-list">
          <h2 id="invoice-list" className="sr-only">Invoices and quotes</h2>
          {rows.length === 0 ? (
            <EmptyState icon={FileText} title="No invoices yet">Create one from a recorded sale.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {rows.map((invoice) => {
                const kind = invoice.kind ?? 'invoice';
                const reminders = (invoice.invoice_reminders ?? []).filter((r) => r.state === 'accepted_by_workflow');
                const lastReminder = reminders.map((r) => r.created_at).sort().at(-1);
                return (
                  <li key={invoice.id} className="studio-card flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {invoice.invoice_number}
                        {kind === 'quote' && <span className="studio-pill ml-2 align-middle">quote</span>}
                      </p>
                      <p className="text-xs text-slate-400">
                        {invoice.buyer?.name ?? '—'} · issued {invoice.issue_date}
                        {kind === 'invoice' && invoice.due_date && ` · due ${invoice.due_date}`}
                        {kind === 'quote' && invoice.valid_until && ` · valid until ${invoice.valid_until}`}
                        {invoice.paid_at && ` · paid ${invoice.paid_at.slice(0, 10)}`}
                        {lastReminder && ` · ${reminders.length} reminder${reminders.length === 1 ? '' : 's'}, last ${lastReminder.slice(0, 10)}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-studio font-semibold">{formatCurrency(Number(invoice.amount), invoice.currency ?? 'USD')}</span>
                      <InvoiceActions id={invoice.id} kind={kind} status={invoice.status} remindersEnabled={quickWins} />
                      <a href={`/api/studio/invoices/${invoice.id}/pdf`} className="inline-flex h-8 items-center gap-1 rounded-full bg-[#E3F7EE] px-3 text-xs font-semibold text-slate-800">
                        <Download className="h-3.5 w-3.5" aria-hidden /> PDF
                      </a>
                      {kind === 'invoice' && invoice.status === 'paid' && quickWins && (
                        <a href={`/api/studio/invoices/${invoice.id}/pdf?as=receipt`} className="inline-flex h-8 items-center gap-1 rounded-full bg-[#E3F7EE] px-3 text-xs font-semibold text-slate-800">
                          <Download className="h-3.5 w-3.5" aria-hidden /> Receipt
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
