# Documents, file tools, sales and invoices

## Documents & PDFs — `/studio/tools`

Rename presentation label if desired but keep route and existing tools. Header “Documents & PDFs”. First row links to Artwork catalogue, Portfolio/price list and Invoices. Below, use tabs or compact panels for existing PDF maker, PDF compressor and image optimizer; preserve their actual handlers and browser-local operation.

PDF maker: upload/order inputs, supported settings, preview and download. Compressor: file, output settings where supported, before/after size, quality explanation and download. Image optimizer: supported images, output settings/preview and download. Preserve original files; never overwrite archive originals automatically. A smaller size is not guaranteed, and the UI must state when a result is not smaller. Unsupported/encrypted/damaged files get clear errors.

Exhibition catalogue appears as a source option or contextual invocation of the existing renderer. Do not add a universal document editor or a second PDF library. A document history panel is optional only if persisted document records already exist or the completion task specifically establishes them; do not fill it with fake downloads.

## Sales tracker — `/studio/sales`

Preserve current offline sales entry, artwork/contact associations, amounts, currency, date and status. Reach it under Collectors secondary tabs and any existing links. Enquiry-only public sales does not mean deleting this module. Keep actual recording workflow; do not add payment capture.

## Invoices — `/studio/invoices`

Preserve create-from-sale, line items, numbering, tax fields, seller/buyer snapshots, status controls and existing `/api/studio/invoices/[id]/pdf`. Table: invoice number, collector, date, amount/currency, status and PDF/action menu. Form totals use existing tested helper; issued invoice edits follow current rules. Do not infer jurisdictional tax rates, convert currencies implicitly, or mark an invoice paid merely because it was generated.

Acceptance: existing catalogues, sales and invoice PDFs work; all file tools remain reachable; documents render with correct actual metadata/images and no cropped art; errors do not damage originals.
