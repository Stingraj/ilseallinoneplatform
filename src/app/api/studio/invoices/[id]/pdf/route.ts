import { createElement } from 'react';
import { NextResponse, type NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { InvoiceDocument, type InvoiceDocumentData } from '@/lib/invoices/invoice-pdf';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { client } = await getOwnerClient();
  if (!client) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { data: invoice } = await client.from('invoices').select('*, invoice_items(*)').eq('id', id).maybeSingle();
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  // ?as=receipt prints a receipt, only for a paid invoice. Quotes always print as quotes.
  const wantsReceipt = request.nextUrl.searchParams.get('as') === 'receipt';
  if (wantsReceipt && (invoice.kind === 'quote' || invoice.status !== 'paid')) {
    return NextResponse.json({ error: 'A receipt is available once the invoice is marked paid.' }, { status: 409 });
  }
  const document = invoice.kind === 'quote' ? 'quote' : wantsReceipt ? 'receipt' : 'invoice';

  const data: InvoiceDocumentData = {
    invoice_number: invoice.invoice_number,
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    currency: invoice.currency ?? 'USD',
    tax_rate: Number(invoice.tax_rate ?? 0),
    tax_label: invoice.tax_label,
    notes: invoice.notes,
    status: invoice.status,
    document,
    valid_until: invoice.valid_until ?? null,
    paid_at: invoice.paid_at ?? null,
    seller: invoice.seller,
    buyer: invoice.buyer,
    items: [...(invoice.invoice_items ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({ description: item.description, quantity: Number(item.quantity), unit_amount: Number(item.unit_amount) })),
  };
  if (data.items.length === 0) data.items = [{ description: 'Artwork', quantity: 1, unit_amount: Number(invoice.amount) }];

  const pdf = await renderToBuffer(createElement(InvoiceDocument, { invoice: data }) as unknown as Parameters<typeof renderToBuffer>[0]);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${document === 'receipt' ? 'Receipt-' : ''}${invoice.invoice_number.replace(/[^A-Za-z0-9-]/g, '')}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
