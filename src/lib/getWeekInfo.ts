/** Saturday, 7 Feb 2026 — the start of academic Week 1 (UTC midnight). */
const WEEK_1_START = new Date('2026-02-07T00:00:00.000Z');
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Returns the current academic week number.
 * Week 1 started on Saturday 7 Feb 2026; a new week begins every Saturday.
 */
export function getCurrentWeek(): number {
  const diffMs = Date.now() - WEEK_1_START.getTime();
  if (diffMs < 0) return 1;
  return Math.floor(diffMs / MS_PER_WEEK) + 1;
}

/**
 * Returns today's date formatted as "D Mon YYYY" (e.g. "14 Mar 2026").
 */
export function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
