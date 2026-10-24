'use client';

import { useState } from 'react';
import { Download, ImageDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { downloadBlob, resizeImage } from '@/lib/tools/image-tools';
import { MAX_TOOL_FILE_BYTES, formatBytes, safeFileName, savingPercent } from '@/lib/tools/format';

interface Result { name: string; before: number; after: number; blob: Blob }

export function ImageOptimizer() {
  const [files, setFiles] = useState<File[]>([]);
  const [maxSide, setMaxSide] = useState(2400);
  const [quality, setQuality] = useState(0.82);
  const [format, setFormat] = useState<'image/jpeg' | 'image/webp'>('image/jpeg');
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const output: Result[] = [];
    for (const file of files) {
      try {
        const blob = await resizeImage(file, { maxSide, quality, type: format });
        const extension = format === 'image/webp' ? 'webp' : 'jpg';
        output.push({ name: `${safeFileName(file.name.replace(/\.[^.]+$/, ''), 'image')}.${extension}`, before: file.size, after: blob.size, blob });
      } catch {
        setError(`${file.name} could not be read. Try a JPG, PNG or WebP file.`);
      }
    }
    setResults(output);
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">Resize and compress photographs for the website, email or social media. Processing happens in your browser; files are not uploaded.</p>
      <input
        type="file"
        accept="image/*"
        multiple
        aria-label="Choose images"
        onChange={(e) => {
          const chosen = Array.from(e.target.files ?? []);
          const tooBig = chosen.filter((f) => f.size > MAX_TOOL_FILE_BYTES);
          setError(tooBig.length ? `${tooBig.length} file(s) are larger than 50 MB and were skipped.` : null);
          setFiles(chosen.filter((f) => f.size <= MAX_TOOL_FILE_BYTES && f.type.startsWith('image/')));
          setResults([]);
        }}
        className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[#F0EAFE] file:px-4 file:py-2 file:text-sm file:font-semibold"
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="io-size">Longest side</Label>
          <select id="io-size" value={maxSide} onChange={(e) => setMaxSide(Number(e.target.value))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value={3200}>3200 px (print preview)</option>
            <option value={2400}>2400 px (website)</option>
            <option value={1600}>1600 px (email)</option>
            <option value={1080}>1080 px (social)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="io-quality">Quality {Math.round(quality * 100)}%</Label>
          <input id="io-quality" type="range" min={0.5} max={0.95} step={0.01} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="io-format">Format</Label>
          <select id="io-format" value={format} onChange={(e) => setFormat(e.target.value as typeof format)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="image/jpeg">JPEG (works everywhere)</option>
            <option value="image/webp">WebP (smaller)</option>
          </select>
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button onClick={run} disabled={!files.length || busy} className="bg-slate-900 text-white">
        <ImageDown className="mr-2 h-4 w-4" aria-hidden />{busy ? 'Optimising…' : `Optimise ${files.length || ''} image${files.length === 1 ? '' : 's'}`}
      </Button>
      {results.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100" aria-live="polite">
          {results.map((result) => (
            <li key={result.name} className="flex items-center justify-between gap-4 p-3 text-sm">
              <span className="truncate font-medium">{result.name}</span>
              <span className="shrink-0 text-slate-500">{formatBytes(result.before)} → {formatBytes(result.after)} <strong className="text-emerald-700">({savingPercent(result.before, result.after)}%)</strong></span>
              <Button size="sm" variant="outline" onClick={() => downloadBlob(result.blob, result.name)}><Download className="h-4 w-4" aria-hidden /><span className="sr-only">Download</span></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
