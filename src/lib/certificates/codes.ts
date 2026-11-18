import { randomBytes } from 'node:crypto';

/** The random code printed on a certificate and encoded in its QR code (96 bits, 16 URL-safe characters). */
export function createVerifyCode(): string {
  return randomBytes(12).toString('base64url');
}

export function isWellFormedVerifyCode(code: unknown): code is string {
  return typeof code === 'string' && /^[A-Za-z0-9_-]{16}$/.test(code);
}

/** What a certificate states about the work. Captured when it is issued, so later archive edits never change it. */
export interface CertificateDetails {
  artist: string;
  title: string;
  year: string | null;
  medium: string | null;
  dimensions: string | null;
  signature: string | null;
  edition: string | null;
  inventoryNumber: string | null;
  imageUrl: string | null;
}

export interface CertificateArtwork {
  title?: string | null;
  year?: number | string | null;
  medium?: string | null;
  dimensions?: string | null;
  signature?: string | null;
  edition_number?: string | null;
  edition_size?: string | null;
  inventory_number?: string | null;
  image_url?: string | null;
}

const clean = (value: unknown): string | null => {
  const text = value === null || value === undefined ? '' : String(value).trim();
  return text ? text : null;
};

export function certificateDetails(artwork: CertificateArtwork, artist: string): CertificateDetails {
  const number = clean(artwork.edition_number);
  const size = clean(artwork.edition_size);
  return {
    artist: artist.trim() || 'The artist',
    title: clean(artwork.title) ?? 'Untitled',
    year: clean(artwork.year),
    medium: clean(artwork.medium),
    dimensions: clean(artwork.dimensions),
    signature: clean(artwork.signature),
    edition: number && size ? `${number} / ${size}` : number ?? (size ? `Edition of ${size}` : null),
    inventoryNumber: clean(artwork.inventory_number),
    imageUrl: clean(artwork.image_url),
  };
}

/** Only these fields are shown on the public verify page: never the owner's name, price or location. */
export function publicCertificateFields(details: Partial<CertificateDetails> | null | undefined) {
  const d = details ?? {};
  return {
    artist: clean(d.artist),
    title: clean(d.title),
    year: clean(d.year),
    medium: clean(d.medium),
    dimensions: clean(d.dimensions),
    edition: clean(d.edition),
    imageUrl: clean(d.imageUrl),
  };
}
