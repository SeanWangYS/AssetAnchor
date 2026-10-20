import Decimal from 'decimal.js';
import type { DatedFlow } from './cashFlows.js';
import { daysBetween, xirr } from './xirr.js';

const D = Decimal.clone({ precision: 34, rounding: Decimal.ROUND_HALF_UP });

export interface PerformanceSummary {
  /** `annualized` = XIRR; `cumulative` = total gain / total invested (not annualized). */
  kind: 'annualized' | 'cumulative';
  /** 10-dp decimal string, e.g. `0.3928000000` for +39.28%. */
  rate: string;
  /** Amount-weighted average years invested (Sharesight convention), 10-dp string. */
  averageYearsInvested: string;
}

/**
 * Portfolio or per-symbol performance (design spec D9). Average years invested (AYI)
 * weights each outflow by its amount and how long it has been invested, so a tiny old
 * buy cannot make mostly-new money look "long term". AYI >= 1 year: XIRR. Otherwise,
 * following GIPS (never annualize under a year), the cumulative return
 * (terminal + inflows - outflows) / outflows.
 *
 * Cash dividends are not recorded yet, so high-dividend holdings are understated.
 * Returns `null` without any outflow, or when the annualized rate cannot be solved.
 */
export function summarizePerformance(
  flows: readonly DatedFlow[],
  terminal: DatedFlow,
): PerformanceSummary | null {
  const outflows = flows.filter((f) => f.amount.isNegative());
  if (outflows.length === 0) return null;

  const amountOf = (f: DatedFlow) => new D(f.amount.toDecimalString());
  const invested = outflows.reduce((s, f) => s.plus(amountOf(f).abs()), new D(0));
  const weighted = outflows.reduce(
    (s, f) => s.plus(amountOf(f).abs().times(daysBetween(f.date, terminal.date)).div(365)),
    new D(0),
  );
  const ayi = weighted.div(invested);
  const averageYearsInvested = ayi.toDecimalPlaces(10).toFixed(10);

  if (ayi.gte(1)) {
    const rate = xirr(flows, terminal);
    return rate === null ? null : { kind: 'annualized', rate, averageYearsInvested };
  }

  const inflows = flows
    .filter((f) => f.amount.isPositive())
    .reduce((s, f) => s.plus(amountOf(f)), new D(0));
  const cumulative = amountOf(terminal).plus(inflows).minus(invested).div(invested);
  return {
    kind: 'cumulative',
    rate: cumulative.toDecimalPlaces(10).toFixed(10),
    averageYearsInvested,
  };
}
