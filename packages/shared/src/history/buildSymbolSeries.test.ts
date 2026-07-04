import { buildSymbolSeries, mergeChunkCloses, timeframeStart } from './buildSymbolSeries.js';

describe('mergeChunkCloses', () => {
  it('跨年度分塊合併為單一 map', () => {
    const merged = mergeChunkCloses([
      { year: 2025, closes: { '2025-01-02': '10.0000000000' } },
      { year: 2024, closes: { '2024-12-30': '9.0000000000' } },
    ]);
    expect(merged).toEqual({
      '2024-12-30': '9.0000000000',
      '2025-01-02': '10.0000000000',
    });
  });
});

describe('buildSymbolSeries', () => {
  const chunks = [
    { year: 2024, closes: { '2024-12-30': '9.0000000000', '2024-12-31': '9.5000000000' } },
    { year: 2025, closes: { '2025-01-02': '10.0000000000', '2025-01-03': '10.5000000000' } },
  ];

  it('合併排序輸出點列（無界）', () => {
    const s = buildSymbolSeries(chunks, {});
    expect(s.map((p) => p.date)).toEqual(['2024-12-30', '2024-12-31', '2025-01-02', '2025-01-03']);
    expect(s[0]?.close).toBe('9.0000000000');
  });

  it('from/to 含端點切片', () => {
    const s = buildSymbolSeries(chunks, { from: '2024-12-31', to: '2025-01-02' });
    expect(s.map((p) => p.date)).toEqual(['2024-12-31', '2025-01-02']);
  });

  it('空分塊回空陣列', () => {
    expect(buildSymbolSeries([], {})).toEqual([]);
  });
});

describe('timeframeStart', () => {
  const today = '2026-07-04';

  it('1M / 3M / 1Y 回推對應月數', () => {
    expect(timeframeStart('1M', today, null)).toBe('2026-06-04');
    expect(timeframeStart('3M', today, null)).toBe('2026-04-04');
    expect(timeframeStart('1Y', today, null)).toBe('2025-07-04');
  });

  it('月底回推到較短月份時 clamp 到月底', () => {
    expect(timeframeStart('1M', '2026-03-31', null)).toBe('2026-02-28');
    expect(timeframeStart('3M', '2026-05-31', null)).toBe('2026-02-28');
  });

  it('YTD 回當年 1/1', () => {
    expect(timeframeStart('YTD', today, null)).toBe('2026-01-01');
  });

  it('ALL 回最早交易日；無交易回 null（無下界）', () => {
    expect(timeframeStart('ALL', today, '2024-01-10')).toBe('2024-01-10');
    expect(timeframeStart('ALL', today, null)).toBeNull();
  });
});
