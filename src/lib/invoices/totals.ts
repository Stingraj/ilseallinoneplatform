export interface InvoiceLine {
  description: string;
  quantity: number;
  unit_amount: number;
}

/** Amounts are rounded to cents at each step so the PDF, the list and the database always agree. */
export function invoiceTotals(lines: InvoiceLine[], taxRatePercent: number) {
  const round = (value: number) => Math.round(value * 100) / 100;
  const subtotal = round(lines.reduce((sum, line) => sum + round(line.quantity * line.unit_amount), 0));
  const tax = round(subtotal * (taxRatePercent / 100));
  return { subtotal, tax, total: round(subtotal + tax) };
}

/** INV-2026-007 style numbers, sequential per calendar year. */
export function nextInvoiceNumber(existing: string[], year: number): string {
  const prefix = `INV-${year}-`;
  const highest = existing
    .filter((number) => number.startsWith(prefix))
    .map((number) => Number(number.slice(prefix.length)))
    .filter(Number.isFinite)
    .reduce((max, value) => Math.max(max, value), 0);
  return `${prefix}${String(highest + 1).padStart(3, '0')}`;
}
