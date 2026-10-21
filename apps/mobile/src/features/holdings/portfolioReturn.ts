import {
  buildCashFlows,
  mergeChunkCloses,
  summarizePerformance,
  type Currency,
  type HistoryChunk,
  type Money,
  type PerformanceSummary,
  type TransactionDocument,
} from '@assetanchor/shared';

const FX_ID = 'FX_USDTWD';

/** The slice of the holdings hero the return calculation needs. */
export interface ReturnHero {
  valueMoney: Money;
  pendingCount: number;
  notFoundCount: number;
}

export interface PortfolioReturnInput {
  transactions: readonly TransactionDocument[];
  /** historyStore chunks keyed `${symbolId}_${year}`. */
  chunks: Readonly<Record<string, HistoryChunk>>;
  /** True while the FX series is on its first backfill. */
  fxBackfilling: boolean;
  hero: ReturnHero | null;
  displayCurrency: Currency;
  /** Local `YYYY-MM-DD`; the terminal value is dated today. */
  today: string;
}

/**
 * Whole-portfolio XIRR for the holdings bento (design spec D9). Returns `null` (the UI
 * shows "—") when the terminal value is incomplete (a holding has no quote) or when
 * historical FX is not fully loaded: every `FX_USDTWD_${year}` chunk from the first
 * trade that needs conversion through this year must be present, so a half-loaded
 * series never prices old trades with another year's rate.
 */
export function computePortfolioReturn(input: PortfolioReturnInput): PerformanceSummary | null {
  const { hero, displayCurrency, today } = input;
  if (hero === null || hero.pendingCount > 0 || hero.notFoundCount > 0) return null;

  if (!fxReadyFor(input)) return null;
  const flows = buildCashFlows({
    transactions: input.transactions,
    displayCurrency,
    fxUsdTwdCloses: fxUsdTwdClosesOf(input.chunks),
  });
  if (!flows.ok) return null;
  return summarizePerformance(flows.flows, { date: today, amount: hero.valueMoney });
}

/**
 * Whether historical FX is complete enough to convert these transactions: when any
 * trade crosses TWD versus the display currency, every `FX_USDTWD_${year}` chunk from
 * that trade's year through this year must be loaded and no backfill may be running.
 * Shared by the bento XIRR and the holdings table's per-row returns.
 */
export function fxReadyFor(input: {
  transactions: readonly TransactionDocument[];
  chunks: Readonly<Record<string, HistoryChunk>>;
  fxBackfilling: boolean;
  displayCurrency: Currency;
  today: string;
}): boolean {
  const firstFxYear = earliestYearNeedingFx(input.transactions, input.displayCurrency);
  if (firstFxYear === null) return true;
  if (input.fxBackfilling) return false;
  const thisYear = Number(input.today.slice(0, 4));
  for (let y = firstFxYear; y <= thisYear; y++) {
    if (input.chunks[`${FX_ID}_${y}`] === undefined) return false;
  }
  return true;
}

/** Merged FX_USDTWD closes from the history chunks. */
export function fxUsdTwdClosesOf(
  chunks: Readonly<Record<string, HistoryChunk>>,
): Record<string, string> {
  return mergeChunkCloses(
    Object.entries(chunks)
      .filter(([key]) => key.startsWith(`${FX_ID}_`))
      .map(([, chunk]) => chunk),
  );
}

/** Year of the earliest BUY/SELL whose currency crosses TWD versus the display currency. */
function earliestYearNeedingFx(
  transactions: readonly TransactionDocument[],
  displayCurrency: Currency,
): number | null {
  let earliest: string | null = null;
  for (const t of transactions) {
    if (t.transaction_type !== 'BUY' && t.transaction_type !== 'SELL') continue;
    if ((t.currency === 'TWD') === (displayCurrency === 'TWD')) continue;
    if (earliest === null || t.transaction_date < earliest) earliest = t.transaction_date;
  }
  return earliest === null ? null : Number(earliest.slice(0, 4));
}
