import { Money } from '../money/index.js';
import type { DatedFlow } from './cashFlows.js';
import { xirr } from './xirr.js';

const f = (date: string, amount: string): DatedFlow => ({ date, amount: new Money(amount, 'TWD') });

/** NPV at `rate` with ACT/365 years (test-side check only, so plain numbers are fine). */
function npv(flows: DatedFlow[], rate: number): number {
  const t0 = Date.parse(`${flows[0]!.date}T00:00:00Z`);
  return flows.reduce((s, x) => {
    const years = (Date.parse(`${x.date}T00:00:00Z`) - t0) / 86_400_000 / 365;
    return s + x.amount.toNumber() / Math.pow(1 + rate, years);
  }, 0);
}

describe('xirr', () => {
  it('matches the Excel XIRR known answer', () => {
    const r = xirr([f('2024-01-01', '-10000')], f('2025-01-01', '11000'));
    expect(r).not.toBeNull();
    expect(Number(r)).toBeCloseTo(0.0997135859, 8);
  });

  it('solves multiple buys and a partial sell to NPV ~ 0', () => {
    const flows = [
      f('2024-01-10', '-265377'),
      f('2024-03-14', '-590840'),
      f('2024-09-05', '-911296'),
      f('2025-05-01', '1095133'),
    ];
    const terminal = f('2026-10-21', '3607500');
    const r = xirr(flows, terminal);
    expect(r).not.toBeNull();
    const all = [...flows, terminal];
    const scale = all.reduce((s, x) => s + Math.abs(x.amount.toNumber()), 0);
    expect(Math.abs(npv(all, Number(r)))).toBeLessThan(scale * 1e-9);
  });

  it('returns a negative rate for a loss', () => {
    const r = xirr([f('2024-01-01', '-10000')], f('2026-01-01', '8000'));
    expect(Number(r)).toBeCloseTo(Math.pow(0.8, 365 / 731) - 1, 8);
  });

  it('returns null without both negative and positive flows', () => {
    expect(xirr([f('2024-01-01', '-10000')], f('2025-01-01', '0'))).toBeNull();
    expect(xirr([f('2024-01-01', '10000')], f('2025-01-01', '5000'))).toBeNull();
  });

  it('converges on an extreme gain', () => {
    const r = xirr([f('2024-01-01', '-100')], f('2024-12-31', '9000'));
    expect(Number(r)).toBeCloseTo(Math.pow(90, 365 / 365) - 1, 6);
  });

  it('falls back to bisection when Newton overshoots below -100%', () => {
    const r = xirr([f('2024-01-01', '-10000')], f('2024-12-31', '5'));
    expect(Number(r)).toBeCloseTo(-0.9995, 6);
  });

  it('returns null when no rate in range solves it', () => {
    // A 1000x gain in one day is far beyond +10000% a year.
    expect(xirr([f('2024-01-01', '-1')], f('2024-01-02', '1000'))).toBeNull();
  });
});
