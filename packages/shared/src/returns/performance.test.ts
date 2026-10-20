import { Money } from '../money/index.js';
import type { DatedFlow } from './cashFlows.js';
import { summarizePerformance } from './performance.js';
import { xirr } from './xirr.js';

const f = (date: string, amount: string): DatedFlow => ({ date, amount: new Money(amount, 'TWD') });

describe('summarizePerformance', () => {
  it('annualizes long holdings with XIRR', () => {
    const flows = [f('2024-01-01', '-10000')];
    const terminal = f('2026-10-21', '15000');
    const r = summarizePerformance(flows, terminal);
    expect(r?.kind).toBe('annualized');
    expect(r?.rate).toBe(xirr(flows, terminal));
    expect(Number(r?.averageYearsInvested)).toBeGreaterThan(2.8);
  });

  it('weights years by amount: a small old buy cannot unlock annualizing', () => {
    // (1,000 x ~3y + 100,000 x ~0.25y) / 101,000 ~ 0.2793 years
    const r = summarizePerformance(
      [f('2023-10-21', '-1000'), f('2026-07-21', '-100000')],
      f('2026-10-21', '110000'),
    );
    expect(r?.kind).toBe('cumulative');
    expect(Number(r?.averageYearsInvested)).toBeCloseTo(0.2793, 3);
  });

  it('treats exactly one year as annualized', () => {
    const r = summarizePerformance([f('2025-10-21', '-10000')], f('2026-10-21', '11000'));
    expect(r?.kind).toBe('annualized');
    expect(r?.averageYearsInvested).toBe('1.0000000000');
  });

  it('includes sell proceeds in the cumulative return', () => {
    const r = summarizePerformance(
      [f('2026-06-01', '-100000'), f('2026-08-01', '30000')],
      f('2026-10-21', '90000'),
    );
    expect(r).toEqual({
      kind: 'cumulative',
      rate: '0.2000000000',
      averageYearsInvested: expect.any(String),
    });
  });

  it('returns null without any investment', () => {
    expect(summarizePerformance([f('2026-06-01', '30000')], f('2026-10-21', '0'))).toBeNull();
    expect(summarizePerformance([], f('2026-10-21', '100'))).toBeNull();
  });

  it('returns null when the annualized rate cannot be solved', () => {
    // Everything lost: no positive flow, so XIRR is undefined.
    expect(summarizePerformance([f('2020-01-01', '-10000')], f('2026-10-21', '0'))).toBeNull();
  });
});
