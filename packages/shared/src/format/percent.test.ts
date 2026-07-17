import { allocatePercentages, formatPercent } from './percent.js';

describe('formatPercent', () => {
  it('預設 2 位、帶正負號（U+2212 負號）', () => {
    expect(formatPercent(5.6)).toBe('+5.60%');
    expect(formatPercent(-5.6)).toBe('−5.60%');
  });

  it('零值不帶號（P2-4 家族）', () => {
    expect(formatPercent(0)).toBe('0.00%');
  });

  it('捨入後為零也不帶號（顯示精度判 0）', () => {
    expect(formatPercent(0.004)).toBe('0.00%');
    expect(formatPercent(-0.004)).toBe('0.00%');
  });

  it('signed:false 回絕對值字串（Pnl display 用）', () => {
    expect(formatPercent(-105.84, { signed: false })).toBe('105.84%');
  });

  it('decimals 可調（佔比 1 位）', () => {
    expect(formatPercent(63.94, { decimals: 1, signed: false })).toBe('63.9%');
  });
});

describe('allocatePercentages（largest-remainder，加總恆 100）', () => {
  it('經典 1/3 案例加總 100.0', () => {
    const out = allocatePercentages([1, 1, 1], 1);
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
    expect(out.filter((v) => v === 33.4)).toHaveLength(1);
    expect(out.filter((v) => v === 33.3)).toHaveLength(2);
  });

  it('原始權重自動正規化（非百分比輸入）', () => {
    expect(allocatePercentages([2, 1, 1], 1)).toEqual([50, 25, 25]);
  });

  it('稽核案例：先捨後加 99.9% 的分佈被修正為 100.0', () => {
    // 63.94 + 20.03 + 16.03 → 各自四捨五入 63.9+20.0+16.0 = 99.9
    const out = allocatePercentages([63.94, 20.03, 16.03], 1);
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
  });

  it('空輸入回空陣列', () => {
    expect(allocatePercentages([], 1)).toEqual([]);
  });

  it('全零回全零（不除以 0）', () => {
    expect(allocatePercentages([0, 0], 1)).toEqual([0, 0]);
  });

  it('負權重 throw（佔比語意無負值）', () => {
    expect(() => allocatePercentages([50, -1], 1)).toThrow();
  });

  it('decimals=0 也守恆', () => {
    const out = allocatePercentages([33.33, 33.33, 33.34], 0);
    expect(out.reduce((a, b) => a + b, 0)).toBe(100);
  });
});
