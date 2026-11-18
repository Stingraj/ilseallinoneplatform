/** Payment-reminder schedule. Pure (dates are YYYY-MM-DD strings in the studio's time zone) so it can be unit tested. */

export const DEFAULT_REMINDER_DAYS = [3, 10, 21];
export const MANUAL_REMINDER_GAP_HOURS = 1;

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Keeps 1–365 day offsets, sorted and without duplicates; at most 10 stages (the database limit). */
export function normalizeReminderDays(days: unknown): number[] {
  const list = Array.isArray(days) ? days : [];
  const clean = [...new Set(list.map(Number).filter((d) => Number.isInteger(d) && d >= 1 && d <= 365))].sort((x, y) => x - y);
  return clean.slice(0, 10);
}

/**
 * The automatic reminder to send today, or null. Stage n is due `days[n-1]` days after the due date. If the daily job
 * missed some days, only the latest due stage is sent (never several emails at once), and never a stage at or below
 * one already sent.
 */
export function dueReminderStage(dueDate: string | null, today: string, days: number[], sentStages: number[]): number | null {
  if (!dueDate) return null;
  const overdue = daysBetween(dueDate, today);
  if (overdue <= 0) return null;
  const schedule = normalizeReminderDays(days);
  let stage = 0;
  schedule.forEach((offset, index) => {
    if (overdue >= offset) stage = index + 1;
  });
  const highestSent = sentStages.reduce((max, s) => Math.max(max, s), 0);
  return stage > highestSent ? stage : null;
}

export function isPastDue(dueDate: string | null, today: string): boolean {
  return Boolean(dueDate) && daysBetween(dueDate as string, today) > 0;
}

/** Today's date (YYYY-MM-DD) in a time zone, so "overdue" matches the studio's calendar, not the server's. */
export function todayIn(timeZone: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
