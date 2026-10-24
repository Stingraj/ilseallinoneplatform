export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

export function savingPercent(before: number, after: number): number {
  if (before <= 0) return 0;
  return Math.round(((before - after) / before) * 100);
}

/** Keeps letters, digits, dot, dash and underscore; never returns an empty name. */
export function safeFileName(name: string, fallback = 'file'): string {
  const cleaned = name.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  return cleaned || fallback;
}

export const MAX_TOOL_FILE_BYTES = 50 * 1024 * 1024;
