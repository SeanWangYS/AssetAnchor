import { aNice } from './aNice.js';

describe('aNice', () => {
  // Contract (matches prototype aa-analysis-charts.jsx): given a max value `v`,
  // return the smallest "nice" number >= v drawn from the ladder
  // [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10] scaled by the relevant power of 10.

  it('returns the exact ladder rung when the value sits on a power of ten', () => {
    expect(aNice(1)).toBe(1);
    expect(aNice(10)).toBe(10);
    expect(aNice(100)).toBe(100);
    expect(aNice(1000)).toBe(1000);
  });

  it('rounds up to the next nice rung within a decade', () => {
    // mantissa 1.1 -> 1.2 rung
    expect(aNice(11)).toBeCloseTo(12, 10);
    // mantissa 1.3 -> 1.5 rung
    expect(aNice(130)).toBeCloseTo(150, 10);
    // mantissa 2.1 -> 2.5 rung
    expect(aNice(2100)).toBeCloseTo(2500, 10);
    // mantissa 5.5 -> 6 rung
    expect(aNice(5500)).toBeCloseTo(6000, 10);
    // mantissa 6.1 -> 8 rung
    expect(aNice(6100)).toBeCloseTo(8000, 10);
    // mantissa 8.1 -> 10 rung
    expect(aNice(8100)).toBeCloseTo(10000, 10);
  });

  it('snaps a mantissa above the top ladder rung up to the next decade', () => {
    // mantissa 9 has no rung <= it in [1..8]; falls through to 10 -> 9000 ceiling 10_000
    expect(aNice(9000)).toBeCloseTo(10000, 10);
    // mantissa exactly 9.9 -> 10
    expect(aNice(990)).toBeCloseTo(1000, 10);
  });

  it('matches the prototype example values (60K / 120K-class axes)', () => {
    // Top holding ~110_000 (2330 TWD) -> nice ceiling 120_000, half-grid 60_000.
    expect(aNice(110000)).toBeCloseTo(120000, 5);
    // Top holding ~58_000 -> 60_000 ceiling.
    expect(aNice(58000)).toBeCloseTo(60000, 5);
  });

  it('is idempotent on a value already on a rung', () => {
    const once = aNice(2100);
    expect(aNice(once)).toBeCloseTo(once, 10);
  });

  it('returns a result greater than or equal to the input', () => {
    for (const v of [3, 37, 412, 9876, 250000, 0.42, 0.07]) {
      expect(aNice(v)).toBeGreaterThanOrEqual(v);
    }
  });

  it('handles fractional values below 1 (sub-decade scaling)', () => {
    // mantissa 4.2 in the 0.1 decade -> 0.5
    expect(aNice(0.42)).toBeCloseTo(0.5, 10);
    // mantissa 7 in the 0.01 decade -> 0.08
    expect(aNice(0.07)).toBeCloseTo(0.08, 10);
  });

  it('is deterministic (same input -> same output)', () => {
    expect(aNice(4321)).toBe(aNice(4321));
  });

  it('returns 0 for a zero max (empty / all-zero chart)', () => {
    // log10(0) is -Infinity in the naive form; the helper must degrade to 0
    // so an empty chart draws a flat baseline instead of NaN.
    expect(aNice(0)).toBe(0);
  });

  it('treats negative input as 0 (axis ceilings are non-negative)', () => {
    expect(aNice(-5)).toBe(0);
  });

  it('returns 0 for non-finite input (NaN / Infinity)', () => {
    expect(aNice(Number.NaN)).toBe(0);
    expect(aNice(Number.POSITIVE_INFINITY)).toBe(0);
    expect(aNice(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});
