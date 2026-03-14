/** Saturday, 7 Feb 2026 — the start of academic Week 1 (UTC midnight). */
const WEEK_1_START = new Date('2026-02-07T00:00:00.000Z');
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

// Injected at build time by Vite via astro.config.mjs → vite.define
declare const __LAST_COMMIT_DATE__: string;

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
 * Returns the date of the last git commit, formatted as "D Mon YYYY".
 * The ISO timestamp is captured at build time via vite.define.
 */
export function getLastCommitDate(): string {
  try {
    if (!__LAST_COMMIT_DATE__) return 'unknown';
    const d = new Date(__LAST_COMMIT_DATE__);
    if (isNaN(d.getTime())) return 'unknown';
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'unknown';
  }
}
