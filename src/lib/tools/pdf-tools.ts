'use client';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { resizeImage } from './image-tools';

export interface MakerPage {
  file: File;
  caption: string;
}

const A4: [number, number] = [595.28, 841.89];
const INK = rgb(0.11, 0.106, 0.102);
const STONE = rgb(0.54, 0.52, 0.5);

/** Builds a simple branded PDF: an optional title page, then one image per page with its caption. */
export async function makePdf({ title, subtitle, artist, pages }: { title: string; subtitle: string; artist: string; pages: MakerPage[] }) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title || 'Document');
  pdf.setAuthor(artist);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);

  if (title) {
    const page = pdf.addPage(A4);
    page.drawText(artist.toUpperCase(), { x: 56, y: A4[1] - 80, size: 9, font: sans, color: STONE });
    page.drawText(title, { x: 56, y: A4[1] / 2, size: 36, font: serif, color: INK, maxWidth: A4[0] - 112, lineHeight: 40 });
    if (subtitle) page.drawText(subtitle, { x: 56, y: A4[1] / 2 - 40, size: 14, font: serifItalic, color: STONE, maxWidth: A4[0] - 112 });
  }

  for (const item of pages) {
    // Re-encode to JPEG at print size: keeps files reasonable and handles HEIC/WebP the browser can decode.
    const jpeg = await resizeImage(item.file, { maxSide: 2400, quality: 0.86, type: 'image/jpeg' });
    const image = await pdf.embedJpg(await jpeg.arrayBuffer());
    const page = pdf.addPage(A4);
    const boxWidth = A4[0] - 112;
    const boxHeight = A4[1] - 200;
    const scale = Math.min(boxWidth / image.width, boxHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, { x: (A4[0] - width) / 2, y: 120 + (boxHeight - height) / 2, width, height });
    if (item.caption) page.drawText(item.caption, { x: 56, y: 72, size: 11, font: serifItalic, color: INK, maxWidth: boxWidth });
    page.drawText(artist, { x: 56, y: 40, size: 8, font: sans, color: STONE });
  }
  return new Blob([new Uint8Array(await pdf.save())], { type: 'application/pdf' });
}

export type CompressionPreset = 'clean' | 'balanced' | 'strong';

export const PRESETS: Record<CompressionPreset, { label: string; detail: string; dpi?: number; quality?: number }> = {
  clean: { label: 'Lossless clean-up', detail: 'Removes unused data and repacks the file. Text and images are untouched.' },
  balanced: { label: 'Balanced (150 dpi)', detail: 'Pages are re-rendered as high-quality images. Good for sharing by email. Text is no longer selectable.', dpi: 150, quality: 0.8 },
  strong: { label: 'Smallest (110 dpi)', detail: 'Strongest reduction for previews. Text is no longer selectable.', dpi: 110, quality: 0.68 },
};

async function cleanUp(bytes: ArrayBuffer) {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  return new Blob([new Uint8Array(await pdf.save({ useObjectStreams: true }))], { type: 'application/pdf' });
}

async function rasterize(bytes: ArrayBuffer, dpi: number, quality: number, onProgress?: (page: number, total: number) => void) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.mjs';
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes) });
  const source = await task.promise;
  const output = await PDFDocument.create();

  for (let index = 1; index <= source.numPages; index += 1) {
    onProgress?.(index, source.numPages);
    const page = await source.getPage(index);
    const pointsViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: dpi / 72 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, viewport }).promise;
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding failed'))), 'image/jpeg', quality));
    const image = await output.embedJpg(await blob.arrayBuffer());
    const target = output.addPage([pointsViewport.width, pointsViewport.height]);
    target.drawImage(image, { x: 0, y: 0, width: pointsViewport.width, height: pointsViewport.height });
    page.cleanup();
  }
  await task.destroy();
  return new Blob([new Uint8Array(await output.save({ useObjectStreams: true }))], { type: 'application/pdf' });
}

/** Compresses in the browser, so private documents never leave the device. Returns the original if nothing was gained. */
export async function compressPdf(file: File, preset: CompressionPreset, onProgress?: (page: number, total: number) => void) {
  const bytes = await file.arrayBuffer();
  const settings = PRESETS[preset];
  const result = settings.dpi ? await rasterize(bytes, settings.dpi, settings.quality ?? 0.8, onProgress) : await cleanUp(bytes);
  return result.size < file.size ? { blob: result, improved: true } : { blob: file as Blob, improved: false };
}
