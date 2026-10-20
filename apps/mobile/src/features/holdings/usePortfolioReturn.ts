import { useMemo } from 'react';
import type { Currency, PerformanceSummary } from '@assetanchor/shared';
import { useHistoryStore } from '../../services/history';
import { useTransactionsStore } from '../transactions/transactionsStore';
import { computePortfolioReturn, type ReturnHero } from './portfolioReturn';
import { localToday } from './useTrendSeries';

/**
 * Whole-portfolio XIRR for the holdings bento. Read-only on purpose: the FX_USDTWD series
 * is loaded by `useTrendSeries` on the same screen, so this hook never calls
 * `historyStore.loadFor` and adds zero Firestore reads.
 */
export function usePortfolioReturn(
  hero: ReturnHero | null,
  displayCurrency: Currency,
): PerformanceSummary | null {
  const transactions = useTransactionsStore((s) => s.transactions);
  const chunks = useHistoryStore((s) => s.chunks);
  const fxBackfilling = useHistoryStore((s) => s.backfilling['FX_USDTWD'] === true);
  const today = localToday();
  const valueMoney = hero?.valueMoney;
  const pendingCount = hero?.pendingCount;
  const notFoundCount = hero?.notFoundCount;

  return useMemo(
    () =>
      computePortfolioReturn({
        transactions,
        chunks,
        fxBackfilling,
        hero:
          valueMoney === undefined || pendingCount === undefined || notFoundCount === undefined
            ? null
            : { valueMoney, pendingCount, notFoundCount },
        displayCurrency,
        today,
      }),
    // valueMoney is a new Money each render; key on its canonical string instead.
    [
      transactions,
      chunks,
      fxBackfilling,
      valueMoney?.toDecimalString(),
      pendingCount,
      notFoundCount,
      displayCurrency,
      today,
    ],
  );
}
