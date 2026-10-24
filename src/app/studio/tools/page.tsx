import Link from 'next/link';
import { BookOpen, FileText, ListOrdered, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/studio/page-header';
import { SITE } from '@/lib/site/config';
import { ImageOptimizer } from './image-optimizer';
import { PdfCompressor } from './pdf-compressor';
import { PdfMaker } from './pdf-maker';

const DOCUMENTS = [
  { href: '/studio/archive/catalog', title: 'Artwork catalogue', text: 'The full illustrated catalogue from your archive.', icon: BookOpen },
  { href: '/studio/archive', title: 'Portfolio & price list', text: 'Select works and export a PDF, with or without prices.', icon: ListOrdered },
  { href: '/studio/invoices', title: 'Invoices', text: 'PDF invoices generated from recorded sales.', icon: Receipt },
];

export default function ToolsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="PDF & Tools" description="Documents from your archive, plus everyday file tools that run privately in your browser." />

      <section aria-labelledby="documents">
        <h2 id="documents" className="mb-3 font-studio text-lg font-semibold">Archive documents</h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {DOCUMENTS.map((doc) => (
            <li key={doc.href}>
              <Link href={doc.href} className="studio-card flex h-full gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C9B8F5]"><doc.icon className="h-5 w-5" aria-hidden /></span>
                <span>
                  <span className="block font-semibold text-slate-900">{doc.title}</span>
                  <span className="mt-1 block text-sm text-slate-500">{doc.text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="studio-card p-6" aria-labelledby="maker">
          <h2 id="maker" className="mb-4 flex items-center gap-2 font-studio text-lg font-semibold"><FileText className="h-5 w-5" aria-hidden />PDF maker</h2>
          <PdfMaker artistName={SITE.artistName} />
        </section>
        <section className="studio-card p-6" aria-labelledby="compressor">
          <h2 id="compressor" className="mb-4 font-studio text-lg font-semibold">PDF compressor</h2>
          <PdfCompressor />
        </section>
        <section className="studio-card p-6 xl:col-span-2" aria-labelledby="optimizer">
          <h2 id="optimizer" className="mb-4 font-studio text-lg font-semibold">Image optimiser</h2>
          <ImageOptimizer />
        </section>
      </div>
    </div>
  );
}
