/**
 * Quote staleness levels for the holdings-overview notice (design spec D8).
 *
 * The 15-minute cache TTL (`isFresh`) is too eager for a user-facing notice: ordinary
 * refresh lag crosses it all the time. Past 1h a quote is almost certainly not being
 * refreshed (backend failure); past 24h it is an outage. `fetched_at` is the time the
 * backend last fetched successfully, and it keeps advancing while markets are closed,
 * so a closed market never trips these thresholds.
 */
export const QUOTE_STALE_SOFT_MS = 60 * 60_000;
export const QUOTE_STALE_HARD_MS = 24 * 60 * 60_000;

const DAY_MS = 24 * 60 * 60_000;

export type QuoteStalenessLevel = 'fresh' | 'soft' | 'hard';

export interface QuoteStaleness {
  level: QuoteStalenessLevel;
  /** Oldest `fetchedAtMs` among the inputs; `null` for an empty set. */
  oldestMs: number | null;
  /** Whole days (floored) since the oldest quote was fetched. */
  ageDays: number;
  /** How many quotes are past the hard threshold. */
  hardCount: number;
  total: number;
}

/**
 * Classifies held positions' quote timestamps. The OLDEST quote decides the level: the
 * newest one only proves that something succeeded once, which is how the 2026-09 outage
 * went unnoticed. Future timestamps (clock skew, dirty data) count as age 0. An empty
 * set is `fresh`; missing quotes are handled by the existing "updating" disclosure.
 */
export function classifyQuoteStaleness(
  fetchedAtMs: readonly number[],
  nowMs: number,
): QuoteStaleness {
  if (fetchedAtMs.length === 0) {
    return { level: 'fresh', oldestMs: null, ageDays: 0, hardCount: 0, total: 0 };
  }
  const ageOf = (t: number) => Math.max(0, nowMs - t);
  const oldestMs = Math.min(...fetchedAtMs);
  const oldestAge = ageOf(oldestMs);
  const hardCount = fetchedAtMs.filter((t) => ageOf(t) > QUOTE_STALE_HARD_MS).length;
  const level: QuoteStalenessLevel =
    oldestAge > QUOTE_STALE_HARD_MS ? 'hard' : oldestAge > QUOTE_STALE_SOFT_MS ? 'soft' : 'fresh';
  return {
    level,
    oldestMs,
    ageDays: Math.floor(oldestAge / DAY_MS),
    hardCount,
    total: fetchedAtMs.length,
  };
}
