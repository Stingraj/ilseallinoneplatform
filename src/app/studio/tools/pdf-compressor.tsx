'use client';

import { useState } from 'react';
import { Download, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadBlob } from '@/lib/tools/image-tools';
import { MAX_TOOL_FILE_BYTES, formatBytes, safeFileName, savingPercent } from '@/lib/tools/format';
import { PRESETS, compressPdf, type CompressionPreset } from '@/lib/tools/pdf-tools';

export function PdfCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<CompressionPreset>('balanced');
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; improved: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!file) return;
    setError(null);
    setResult(null);
    setProgress('Starting…');
    try {
      setResult(await compressPdf(file, preset, (page, total) => setProgress(`Page ${page} of ${total}`)));
    } catch (err) {
      setError(err instanceof Error && /password|encrypt/i.test(err.message) ? 'This PDF is password-protected and cannot be compressed.' : 'This PDF could not be processed.');
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">Make catalogues and portfolios small enough to email. Files are processed in your browser and are not uploaded or stored.</p>
      <input
        type="file"
        accept="application/pdf"
        aria-label="Choose a PDF"
        onChange={(e) => {
          const chosen = e.target.files?.[0] ?? null;
          setResult(null);
          if (chosen && (chosen.type !== 'application/pdf' || chosen.size > MAX_TOOL_FILE_BYTES)) {
            setError('Choose a PDF file up to 50 MB.');
            setFile(null);
            return;
          }
          setError(null);
          setFile(chosen);
        }}
        className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[#F0EAFE] file:px-4 file:py-2 file:text-sm file:font-semibold"
      />
      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="sr-only">Compression level</legend>
        {(Object.keys(PRESETS) as CompressionPreset[]).map((key) => (
          <label key={key} className={`cursor-pointer rounded-xl border-2 p-3 text-sm ${preset === key ? 'border-[#C9B8F5] bg-[#F7F3FF]' : 'border-slate-100'}`}>
            <input type="radio" name="preset" value={key} checked={preset === key} onChange={() => setPreset(key)} className="sr-only" />
            <span className="font-semibold text-slate-900">{PRESETS[key].label}</span>
            <span className="mt-1 block text-xs text-slate-500">{PRESETS[key].detail}</span>
          </label>
        ))}
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <Button onClick={run} disabled={!file || Boolean(progress)} className="bg-slate-900 text-white">
        <FileArchive className="mr-2 h-4 w-4" aria-hidden />{progress ?? 'Compress PDF'}
      </Button>
      {result && file && (
        <div role="status" className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>
            {result.improved
              ? <>{formatBytes(file.size)} → {formatBytes(result.blob.size)} <strong className="text-emerald-700">({savingPercent(file.size, result.blob.size)}% smaller)</strong></>
              : 'This file is already as small as this setting can make it. Try a stronger setting.'}
          </span>
          {result.improved && (
            <Button size="sm" variant="outline" onClick={() => downloadBlob(result.blob, `${safeFileName(file.name.replace(/\.pdf$/i, ''), 'document')}-compressed.pdf`)}>
              <Download className="mr-1 h-4 w-4" aria-hidden />Download
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
