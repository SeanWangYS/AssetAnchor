import { useCallback, useMemo, useState } from 'react';
import {
  buildCashFlows,
  deriveHoldingsByAccount,
  summarizePerformance,
  type AccountRef,
  type Currency,
  type Money,
  type Position,
  type RateMap,
  type TransactionDocument,
} from '@assetanchor/shared';
import { useHistoryStore } from '../../services/history';
import {
  readHoldingsSort,
  writeHoldingsSort,
  type HoldingsSort,
  type HoldingsSortKey,
} from '../../services/localPrefs';
import { quoteErrorFor, quoteFor, type QuoteEntry } from '../../services/quotes';
import type { QuoteErrorCode } from '@assetanchor/shared';
import {
  buildTableSections,
  nextSort,
  sortRows,
  type RowContext,
  type TableGroupMode,
  type TableSection,
} from './holdingsTable';
import { fxReadyFor, fxUsdTwdClosesOf } from './portfolioReturn';
import { localToday } from './useTrendSeries';

/** Sort choice persisted on the device (MMKV); falls back to market value descending. */
export function useHoldingsSort(): [HoldingsSort, (key: HoldingsSortKey) => void] {
  const [sort, setSort] = useState<HoldingsSort>(() => readHoldingsSort());
  const onSort = useCallback((key: HoldingsSortKey) => {
    setSort((current) => {
      const next = nextSort(current, key);
      writeHoldingsSort(next);
      return next;
    });
  }, []);
  return [sort, onSort];
}

export interface HoldingsTableInput {
  mode: TableGroupMode;
  sort: HoldingsSort;
  positions: readonly Position[];
  transactions: readonly TransactionDocument[];
  accounts: readonly AccountRef[];
  quotes: Record<string, QuoteEntry>;
  quoteErrors: Record<string, QuoteErrorCode>;
  rates: RateMap | null;
  displayCurrency: Currency;
  /** Whole-portfolio market value (hero), the weight denominator. */
  totalValue: Money | null;
}

/**
 * Sections for the holdings table, sorted within each group. Per-row returns reuse the
 * FX series already loaded by the trend chart (read-only: never calls loadFor, zero new
 * reads); in the account grouping a row counts only that account's trades.
 */
export function useHoldingsTable(input: HoldingsTableInput): TableSection[] {
  const chunks = useHistoryStore((s) => s.chunks);
  const fxBackfilling = useHistoryStore((s) => s.backfilling['FX_USDTWD'] === true);
  const today = localToday();
  const {
    mode,
    sort,
    positions,
    transactions,
    accounts,
    quotes,
    quoteErrors,
    rates,
    displayCurrency,
    totalValue,
  } = input;
  const totalKey = totalValue?.toDecimalString();

  return useMemo(() => {
    const fxReady = fxReadyFor({ transactions, chunks, fxBackfilling, displayCurrency, today });
    const fxUsdTwdCloses = fxReady ? fxUsdTwdClosesOf(chunks) : {};
    const ctx: RowContext = {
      getQuote: (market, symbol) => quoteFor(quotes, market, symbol),
      errorOf: (market, symbol) => quoteErrorFor(quoteErrors, market, symbol),
      rates,
      displayCurrency,
      nowMs: Date.now(),
      totalValue,
      performanceOf: (position, accountIds, marketValue) => {
        if (!fxReady) return null;
        const flows = buildCashFlows({
          transactions,
          displayCurrency,
          fxUsdTwdCloses,
          filter:
            accountIds === undefined
              ? { market: position.market, symbol: position.symbol }
              : { market: position.market, symbol: position.symbol, accountIds },
        });
        if (!flows.ok) return null;
        return summarizePerformance(flows.flows, { date: today, amount: marketValue });
      },
    };
    const knownIds = new Set(accounts.map((a) => a.account_id));
    const orphanAccountIds = [
      ...new Set(transactions.map((t) => t.account_id).filter((id) => !knownIds.has(id))),
    ];
    const accountGroups =
      mode === '帳戶' ? deriveHoldingsByAccount([...transactions], accounts) : [];
    return buildTableSections({ mode, positions, accountGroups, orphanAccountIds, ctx }).map(
      (s) => ({ ...s, rows: sortRows(s.rows, sort) }),
    );
    // totalKey stands in for totalValue (a new Money object every render).
  }, [
    mode,
    sort,
    positions,
    transactions,
    accounts,
    quotes,
    quoteErrors,
    rates,
    displayCurrency,
    totalKey,
    chunks,
    fxBackfilling,
    today,
  ]);
}
