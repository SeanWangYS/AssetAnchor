import { Money } from '../money/index.js';
import { convertMoney } from '../fx/convertMoney.js';
import { ratesFromUsdTwd } from '../fx/ratesFromUsdTwd.js';
import { transactionTotalWithFees } from '../transactions/transactionTotalWithFees.js';
import type { Currency, Market } from '../enums/index.js';
import type { TransactionDocument } from '../types/index.js';

/** A cash flow on a calendar day (`YYYY-MM-DD`), already in the display currency. */
export interface DatedFlow {
  date: string;
  amount: Money;
}

export type CashFlowsResult =
  | { ok: true; flows: DatedFlow[] }
  | { ok: false; reason: 'fx_unavailable' };

export interface BuildCashFlowsInput {
  transactions: readonly TransactionDocument[];
  displayCurrency: Currency;
  /** FX_USDTWD daily closes (1 USD = N TWD), same shape as price_history `closes`. */
  fxUsdTwdCloses: Readonly<Record<string, string>>;
  /**
   * Restrict to one symbol (per-symbol returns for the holdings table), optionally to a
   * set of accounts: the account grouping counts only that account's trades, and the
   * "unassigned" bucket passes every account_id that no longer exists.
   */
  filter?: { market: Market; symbol: string; accountIds?: readonly string[] };
}

/**
 * Turns the transaction stream into dated cash flows for XIRR (design spec D9):
 * BUY is negative (fee-inclusive cost), SELL is positive (net proceeds) — the same
 * `transactionTotalWithFees` basis as `deriveHoldings`. Each flow is converted at the
 * close on its own transaction date (holidays forward-fill; dates before the first
 * close use the next one). It never substitutes the latest rate: if a TWD<->USD
 * conversion is needed and the series is empty, it reports `fx_unavailable`.
 * Cash dividends are not recorded yet, so they are not part of the flows.
 */
export function buildCashFlows(input: BuildCashFlowsInput): CashFlowsResult {
  const { displayCurrency, filter } = input;
  const fxDates = Object.keys(input.fxUsdTwdCloses).sort();

  const relevant = input.transactions
    .filter((t) => t.transaction_type === 'BUY' || t.transaction_type === 'SELL')
    .filter((t) => !filter || (t.market === filter.market && t.symbol === filter.symbol))
    .filter((t) => filter?.accountIds === undefined || filter.accountIds.includes(t.account_id))
    .map((t, i) => ({ t, i }))
    // Stable sort by date: same-day flows keep their input order.
    .sort((a, b) =>
      a.t.transaction_date === b.t.transaction_date
        ? a.i - b.i
        : a.t.transaction_date < b.t.transaction_date
          ? -1
          : 1,
    );

  const flows: DatedFlow[] = [];
  for (const { t } of relevant) {
    const gross = Money.fromDecimalString(transactionTotalWithFees(t), t.currency);
    const signed = t.transaction_type === 'BUY' ? gross.negate() : gross;
    if (signed.currency === displayCurrency) {
      flows.push({ date: t.transaction_date, amount: signed });
      continue;
    }
    // Only a TWD <-> USD/USDT pair needs the FX series; USD <-> USDT is the 1:1 peg.
    const crossesTwd = (signed.currency === 'TWD') !== (displayCurrency === 'TWD');
    let close = '1';
    if (crossesTwd) {
      const found = closeOn(fxDates, input.fxUsdTwdCloses, t.transaction_date);
      if (found === null) return { ok: false, reason: 'fx_unavailable' };
      close = found;
    }
    flows.push({
      date: t.transaction_date,
      amount: convertMoney(signed, ratesFromUsdTwd(close), displayCurrency),
    });
  }
  return { ok: true, flows };
}

/** Last close on or before `date`; otherwise the first close after it; `null` if none. */
function closeOn(
  sortedDates: readonly string[],
  closes: Readonly<Record<string, string>>,
  date: string,
): string | null {
  if (sortedDates.length === 0) return null;
  let lo = 0;
  let hi = sortedDates.length - 1;
  let best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if ((sortedDates[mid] as string) <= date) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  const key = sortedDates[best === -1 ? 0 : best] as string;
  return closes[key] ?? null;
}
