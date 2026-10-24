'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, FilePlus2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { downloadBlob } from '@/lib/tools/image-tools';
import { MAX_TOOL_FILE_BYTES, safeFileName } from '@/lib/tools/format';
import { makePdf, type MakerPage } from '@/lib/tools/pdf-tools';

export function PdfMaker({ artistName }: { artistName: string }) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [pages, setPages] = useState<(MakerPage & { key: string; preview: string })[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const move = (index: number, delta: number) =>
    setPages((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });

  async function build() {
    setBusy(true);
    setError(null);
    try {
      const blob = await makePdf({ title, subtitle, artist: artistName, pages });
      downloadBlob(blob, `${safeFileName(title || 'document')}.pdf`);
    } catch {
      setError('The PDF could not be created. Check that every file is an image.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">Combine photographs and captions into a clean, branded PDF: proposals, studio updates, condition reports. For catalogues and price lists of archive works, use the catalogue tools above.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="pm-title">Title page (optional)</Label><Input id="pm-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New works, autumn 2026" /></div>
        <div className="space-y-1.5"><Label htmlFor="pm-sub">Subtitle</Label><Input id="pm-sub" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Prepared for …" /></div>
      </div>
      <input
        type="file"
        accept="image/*"
        multiple
        aria-label="Add images"
        onChange={(e) => {
          const chosen = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/') && f.size <= MAX_TOOL_FILE_BYTES);
          setPages((current) => [...current, ...chosen.map((file) => ({ file, caption: file.name.replace(/\.[^.]+$/, ''), key: `${file.name}-${file.lastModified}-${Math.random()}`, preview: URL.createObjectURL(file) }))]);
          e.target.value = '';
        }}
        className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[#F0EAFE] file:px-4 file:py-2 file:text-sm file:font-semibold"
      />
      {pages.length > 0 && (
        <ol className="space-y-2">
          {pages.map((page, index) => (
            <li key={page.key} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={page.preview} alt="" className="h-14 w-14 rounded-lg object-cover" />
              <Input aria-label={`Caption for page ${index + 1}`} value={page.caption} onChange={(e) => setPages((current) => current.map((p) => (p.key === page.key ? { ...p, caption: e.target.value } : p)))} />
              <Button type="button" size="icon" variant="ghost" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
              <Button type="button" size="icon" variant="ghost" disabled={index === pages.length - 1} onClick={() => move(index, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
              <Button type="button" size="icon" variant="ghost" onClick={() => setPages((current) => current.filter((p) => p.key !== page.key))} aria-label="Remove"><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ol>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button onClick={build} disabled={busy || pages.length === 0} className="bg-slate-900 text-white">
        <FilePlus2 className="mr-2 h-4 w-4" aria-hidden />{busy ? 'Building…' : 'Create PDF'}
      </Button>
    </div>
  );
}
