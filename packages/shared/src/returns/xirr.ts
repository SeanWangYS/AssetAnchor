import Decimal from 'decimal.js';
import type { DatedFlow } from './cashFlows.js';

/**
 * Private Decimal with its own precision so the solver neither changes nor depends on
 * Money's global decimal.js config. The whole solve stays in decimal.js (owner decision
 * 2026-10-21, constitution #2); JS numbers only appear at the UI boundary.
 */
const D = Decimal.clone({ precision: 34, rounding: Decimal.ROUND_HALF_UP });
type Dec = InstanceType<typeof D>;

const LOWER = new D('-0.9999');
const UPPER = new D('100');
const STEP_EPS = new D('1e-14');
const NEWTON_STEPS = 50;
const BISECT_STEPS = 200;
const MS_PER_DAY = 86_400_000;

/** Whole days between two `YYYY-MM-DD` dates, computed in UTC to avoid DST/time-zone drift. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}

interface Point {
  years: Dec;
  amount: Dec;
}

/**
 * Annualized internal rate of return (Excel `XIRR` convention: years = days / 365).
 * `terminal` is the closing value as a positive flow on the valuation date. Newton's
 * method from 10%, falling back to bisection on [-99.99%, +10000%] when Newton leaves
 * that range, hits a zero derivative or does not converge. Returns a 10-dp decimal
 * string, or `null` without both an outflow and an inflow or when no root is in range.
 */
export function xirr(flows: readonly DatedFlow[], terminal: DatedFlow): string | null {
  const all = [...flows, terminal];
  if (!all.some((f) => f.amount.isNegative()) || !all.some((f) => f.amount.isPositive())) {
    return null;
  }
  const start = all.reduce((min, f) => (f.date < min ? f.date : min), terminal.date);
  const points: Point[] = all.map((f) => ({
    years: new D(daysBetween(start, f.date)).div(365),
    amount: new D(f.amount.toDecimalString()),
  }));
  const scale = points.reduce((s, p) => s.plus(p.amount.abs()), new D(0));
  const tol = scale.times('1e-12');

  const npv = (r: Dec): Dec =>
    points.reduce((s, p) => s.plus(p.amount.div(r.plus(1).pow(p.years))), new D(0));
  const dnpv = (r: Dec): Dec =>
    points.reduce(
      (s, p) => s.minus(p.years.times(p.amount).div(r.plus(1).pow(p.years.plus(1)))),
      new D(0),
    );

  const done = (r: Dec) => r.toDecimalPlaces(10).toFixed(10);

  // Newton
  let r = new D('0.1');
  for (let i = 0; i < NEWTON_STEPS; i++) {
    const v = npv(r);
    if (v.abs().lte(tol)) return done(r);
    const d = dnpv(r);
    if (d.isZero()) break;
    const next = r.minus(v.div(d));
    if (!next.isFinite() || next.lte(LOWER) || next.gt(UPPER)) break;
    if (next.minus(r).abs().lt(STEP_EPS)) return done(next);
    r = next;
  }

  // Bisection
  let lo = LOWER;
  let hi = UPPER;
  let fLo = npv(lo);
  const fHi = npv(hi);
  if (fLo.isZero()) return done(lo);
  if (fHi.isZero()) return done(hi);
  if (fLo.isPositive() === fHi.isPositive()) return null;
  for (let i = 0; i < BISECT_STEPS; i++) {
    const mid = lo.plus(hi).div(2);
    const fMid = npv(mid);
    if (fMid.abs().lte(tol) || hi.minus(lo).lt(STEP_EPS)) return done(mid);
    if (fMid.isPositive() === fLo.isPositive()) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }
  return done(lo.plus(hi).div(2));
}
