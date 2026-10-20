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

  const firstFxYear = earliestYearNeedingFx(input.transactions, displayCurrency);
  if (firstFxYear !== null) {
    if (input.fxBackfilling) return null;
    const thisYear = Number(today.slice(0, 4));
    for (let y = firstFxYear; y <= thisYear; y++) {
      if (input.chunks[`${FX_ID}_${y}`] === undefined) return null;
    }
  }

  const fxChunks = Object.entries(input.chunks)
    .filter(([key]) => key.startsWith(`${FX_ID}_`))
    .map(([, chunk]) => chunk);
  const flows = buildCashFlows({
    transactions: input.transactions,
    displayCurrency,
    fxUsdTwdCloses: mergeChunkCloses(fxChunks),
  });
  if (!flows.ok) return null;
  return summarizePerformance(flows.flows, { date: today, amount: hero.valueMoney });
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
