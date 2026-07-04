import {
  chunkBarsByYear,
  computeFetchWindow,
  latestExpectedTradingDay,
  marketTimezone,
} from './historyPlan';

describe('latestExpectedTradingDay', () => {
  it('平日回當天', () => {
    expect(latestExpectedTradingDay('2026-07-03')).toBe('2026-07-03'); // 五
  });
  it('週末回上週五', () => {
    expect(latestExpectedTradingDay('2026-07-04')).toBe('2026-07-03'); // 六
    expect(latestExpectedTradingDay('2026-07-05')).toBe('2026-07-03'); // 日
  });
});

describe('marketTimezone', () => {
  it('TW→台北、US→紐約、FX→UTC', () => {
    expect(marketTimezone('TW')).toBe('Asia/Taipei');
    expect(marketTimezone('US')).toBe('America/New_York');
    expect(marketTimezone('FX')).toBe('UTC');
  });
});

describe('computeFetchWindow', () => {
  // 2026-07-03（五）台北中午
  const nowMs = Date.UTC(2026, 6, 3, 4, 0);

  it('last_date 已涵蓋最近預期交易日 → null（no-op，不打 Yahoo）', () => {
    expect(
      computeFetchWindow({ lastDate: '2026-07-03', from: '2024-01-10', nowMs, market: 'TW' }),
    ).toBeNull();
  });

  it('落後 → 自 last_date − 7 天（回看修補）抓到現在', () => {
    const w = computeFetchWindow({
      lastDate: '2026-06-30',
      from: '2024-01-10',
      nowMs,
      market: 'TW',
    });
    expect(w).not.toBeNull();
    expect(w?.period1Sec).toBe(Math.floor(Date.UTC(2026, 5, 23) / 1000)); // 06-30 − 7d
    expect(w?.period2Sec).toBe(Math.floor(nowMs / 1000));
  });

  it('回看不早於 from（首買日）', () => {
    const w = computeFetchWindow({
      lastDate: '2024-01-12',
      from: '2024-01-10',
      nowMs,
      market: 'TW',
    });
    expect(w?.period1Sec).toBe(Math.floor(Date.UTC(2024, 0, 10) / 1000));
  });

  it('無 last_date → 首次回補，自 from 全抓', () => {
    const w = computeFetchWindow({ lastDate: null, from: '2024-01-10', nowMs, market: 'US' });
    expect(w?.period1Sec).toBe(Math.floor(Date.UTC(2024, 0, 10) / 1000));
  });
});

describe('chunkBarsByYear', () => {
  it('依年份分塊、數值轉 Money 10 位小數 string、last_date 為各塊最大有效日', () => {
    const chunks = chunkBarsByYear(
      [
        { ts: 0, date: '2024-12-30', close: 9.5, adjclose: 9.4 },
        { ts: 0, date: '2025-01-02', close: 10, adjclose: null },
        { ts: 0, date: '2025-01-03', close: null, adjclose: null }, // null 略過
        { ts: 0, date: '2025-01-06', close: 10.5, adjclose: 10.5 },
      ],
      'TWD',
    );
    expect([...chunks.keys()].sort()).toEqual([2024, 2025]);
    expect(chunks.get(2024)).toEqual({
      closes: { '2024-12-30': '9.5000000000' },
      adjcloses: { '2024-12-30': '9.4000000000' },
      last_date: '2024-12-30',
    });
    expect(chunks.get(2025)?.closes).toEqual({
      '2025-01-02': '10.0000000000',
      '2025-01-06': '10.5000000000',
    });
    expect(chunks.get(2025)?.adjcloses).toEqual({ '2025-01-06': '10.5000000000' });
    expect(chunks.get(2025)?.last_date).toBe('2025-01-06');
  });

  it('非正數 / 非有限 close 略過（sanity，對齊 sanitizeQuote 哲學）', () => {
    const chunks = chunkBarsByYear(
      [
        { ts: 0, date: '2025-01-02', close: 0, adjclose: null },
        { ts: 0, date: '2025-01-03', close: -1, adjclose: null },
        { ts: 0, date: '2025-01-06', close: Infinity, adjclose: null },
      ],
      'USD',
    );
    expect(chunks.size).toBe(0);
  });
});
