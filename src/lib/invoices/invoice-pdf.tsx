import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { invoiceTotals, type InvoiceLine } from './totals';

export interface InvoiceDocumentData {
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  tax_rate: number;
  tax_label: string | null;
  notes: string | null;
  status: string;
  seller: { full_name?: string | null; email?: string | null; phone?: string | null; studio_address?: string | null; website?: string | null } | null;
  buyer: { name?: string | null; company?: string | null; email?: string | null; address?: string | null } | null;
  items: InvoiceLine[];
}

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#1C1B1A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  artist: { fontSize: 18, fontFamily: 'Times-Roman' },
  muted: { color: '#8A857F' },
  title: { fontSize: 26, fontFamily: 'Times-Roman', marginBottom: 4 },
  parties: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  label: { fontSize: 8, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8A857F', marginBottom: 6 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#D8D3CC', paddingVertical: 8 },
  head: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1C1B1A', paddingBottom: 6 },
  desc: { flex: 1, paddingRight: 12 },
  qty: { width: 40, textAlign: 'right' },
  amount: { width: 90, textAlign: 'right' },
  totals: { marginTop: 16, alignSelf: 'flex-end', width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  grand: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#1C1B1A', marginTop: 6, paddingTop: 6, fontSize: 12 },
  footer: { position: 'absolute', bottom: 40, left: 48, right: 48, fontSize: 8, color: '#8A857F' },
});

const money = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

export function InvoiceDocument({ invoice }: { invoice: InvoiceDocumentData }) {
  const { subtotal, tax, total } = invoiceTotals(invoice.items, invoice.tax_rate);
  const seller = invoice.seller ?? {};
  const buyer = invoice.buyer ?? {};
  return (
    <Document title={`Invoice ${invoice.invoice_number}`} author={seller.full_name ?? undefined}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.artist}>{seller.full_name ?? 'Artist'}</Text>
            {seller.studio_address ? <Text style={styles.muted}>{seller.studio_address}</Text> : null}
            {seller.email ? <Text style={styles.muted}>{seller.email}</Text> : null}
            {seller.phone ? <Text style={styles.muted}>{seller.phone}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.title}>Invoice</Text>
            <Text>{invoice.invoice_number}</Text>
            <Text style={styles.muted}>Issued {invoice.issue_date}</Text>
            {invoice.due_date ? <Text style={styles.muted}>Due {invoice.due_date}</Text> : null}
            {invoice.status === 'paid' ? <Text style={{ marginTop: 6 }}>PAID</Text> : null}
          </View>
        </View>

        <View style={styles.parties}>
          <View>
            <Text style={styles.label}>Billed to</Text>
            <Text>{buyer.name ?? '—'}</Text>
            {buyer.company ? <Text>{buyer.company}</Text> : null}
            {buyer.address ? <Text style={styles.muted}>{buyer.address}</Text> : null}
            {buyer.email ? <Text style={styles.muted}>{buyer.email}</Text> : null}
          </View>
        </View>

        <View style={styles.head}>
          <Text style={[styles.desc, styles.label]}>Description</Text>
          <Text style={[styles.qty, styles.label]}>Qty</Text>
          <Text style={[styles.amount, styles.label]}>Amount</Text>
        </View>
        {invoice.items.map((item, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.desc}>{item.description}</Text>
            <Text style={styles.qty}>{item.quantity}</Text>
            <Text style={styles.amount}>{money(item.quantity * item.unit_amount, invoice.currency)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}><Text>Subtotal</Text><Text>{money(subtotal, invoice.currency)}</Text></View>
          {invoice.tax_rate > 0 ? (
            <View style={styles.totalRow}><Text>{invoice.tax_label ?? 'Tax'} ({invoice.tax_rate}%)</Text><Text>{money(tax, invoice.currency)}</Text></View>
          ) : null}
          <View style={styles.grand}><Text>Total</Text><Text>{money(total, invoice.currency)}</Text></View>
        </View>

        {invoice.notes ? (
          <View style={{ marginTop: 40 }}>
            <Text style={styles.label}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          {[seller.full_name, seller.website].filter(Boolean).join(' · ')}
        </Text>
      </Page>
    </Document>
  );
}
