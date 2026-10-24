export interface PhysicalSize {
  /** Longer side in centimetres. */
  longCm: number;
  /** Shorter side in centimetres. */
  shortCm: number;
  /** False when the archive record has no usable dimensions and a default was used. */
  known: boolean;
}

const DEFAULT_LONG_CM = 70;
const DEFAULT_SHORT_CM = 55;
const MIN_CM = 15;
const MAX_CM = 260;

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`;
const PAIR = new RegExp(`${NUMBER}\\s*(?:x|×|by)\\s*${NUMBER}(?:\\s*(?:x|×|by)\\s*${NUMBER})?\\s*(cm|centimet(?:er|re)s?|mm|in(?:ch(?:es)?)?\\b|")?`, 'gi');

const toNumber = (value: string) => Number(value.replace(',', '.'));

function toCm(value: number, unit: string | undefined): number {
  const u = (unit ?? '').toLowerCase();
  if (u.startsWith('in') || u === '"') return value * 2.54;
  if (u === 'mm') return value / 10;
  return value; // cm, or no unit: archive entries without a unit are assumed to be centimetres
}

/**
 * Reads the free-text `dimensions` field of the archive ("24 × 30 in", "8 × 10 inches (20 × 25 cm)", "60x80cm").
 * A centimetre figure is preferred when both are given. Depth, if present, is ignored.
 */
export function parseDimensions(text: string | null | undefined): PhysicalSize {
  const fallback: PhysicalSize = { longCm: DEFAULT_LONG_CM, shortCm: DEFAULT_SHORT_CM, known: false };
  if (!text) return fallback;

  const matches = [...text.matchAll(PAIR)].map((m) => ({
    a: toNumber(m[1]),
    b: toNumber(m[2]),
    unit: m[4]?.toLowerCase(),
  }));
  if (matches.length === 0) return fallback;

  const metric = matches.find((m) => m.unit && /^(cm|centimet|mm)/.test(m.unit));
  const chosen = metric ?? matches[0];
  const a = toCm(chosen.a, chosen.unit);
  const b = toCm(chosen.b, chosen.unit);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return fallback;

  const clamp = (value: number) => Math.min(MAX_CM, Math.max(MIN_CM, value));
  const long = Math.max(a, b);
  const short = Math.min(a, b);
  // Clamp the long side, keep the proportion.
  const scale = clamp(long) / long;
  return { longCm: clamp(long), shortCm: Math.max(MIN_CM / 2, short * scale), known: true };
}
