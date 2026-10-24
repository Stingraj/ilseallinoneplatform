import type { PublicExhibition } from './types';

const format = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

/** "12 March – 4 May 2026", "12 March 2026", or "" when there are no dates. */
export function formatExhibitionDates(exhibition: Pick<PublicExhibition, 'startDate' | 'endDate'>): string {
  const { startDate, endDate } = exhibition;
  if (!startDate && !endDate) return '';
  if (startDate && !endDate) return format(startDate, { day: 'numeric', month: 'long', year: 'numeric' });
  if (!startDate && endDate) return `Until ${format(endDate, { day: 'numeric', month: 'long', year: 'numeric' })}`;
  const sameYear = startDate!.slice(0, 4) === endDate!.slice(0, 4);
  const start = format(startDate!, sameYear ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' });
  return `${start} – ${format(endDate!, { day: 'numeric', month: 'long', year: 'numeric' })}`;
}
