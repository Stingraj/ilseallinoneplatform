// Copies pdf.js's worker next to the app so the PDF compressor loads it from this origin (keeps the CSP strict).
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const source = join(dirname(require.resolve('pdfjs-dist/package.json')), 'build', 'pdf.worker.min.mjs');
mkdirSync('public/vendor', { recursive: true });
copyFileSync(source, 'public/vendor/pdf.worker.min.mjs');
