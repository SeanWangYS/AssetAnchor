import { formatFxRate } from './fx.js';

describe('formatFxRate（固定 2 位、不去尾零）', () => {
  it('整值不再顯示成「32」（P2-6）', () => {
    expect(formatFxRate('32')).toBe('32.00');
  });

  it('half-up 捨入到 2 位（decimal 語意，非 float toFixed）', () => {
    expect(formatFxRate('31.995')).toBe('32.00');
    expect(formatFxRate('30.95')).toBe('30.95');
  });

  it('number 輸入也可', () => {
    expect(formatFxRate(31.9)).toBe('31.90');
  });

  it('非有限 / 非法輸入回「—」', () => {
    expect(formatFxRate('abc')).toBe('—');
    expect(formatFxRate(Number.NaN)).toBe('—');
    expect(formatFxRate(Infinity)).toBe('—');
  });
});
