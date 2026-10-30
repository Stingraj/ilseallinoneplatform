import type { Painting } from "@/types/artwork";

/**
 * Paintings in the gallery. The list is filled from the artwork archive: the museum's modules read it once, when
 * they are first imported, so `setPaintings` must run before they load (see MuseumLoader). Order sets the hanging
 * sequence along the corridor; walls alternate left/right.
 */
export const paintings: Painting[] = [];

export function setPaintings(list: readonly Painting[]): void {
  paintings.splice(0, paintings.length, ...list);
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2025-12-29" → "29 December 2025". Parsed by hand so server and client always agree (no time zones). */
export function formatCreationDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
