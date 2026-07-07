import { parseYahooFxRate } from './parseYahooFxRate';

/** 造一段最小 Yahoo v8 chart 回應（TWD=X）。 */
function chartResponse(price: unknown, timeSec: unknown): unknown {
  return {
    chart: {
      result: [
        {
          meta: {
            currency: 'TWD',
            symbol: 'TWD=X',
            regularMarketPrice: price,
            regularMarketTime: timeSec,
          },
        },
      ],
    },
  };
}

describe('parseYahooFxRate', () => {
  it('合法回應抽出 rate（來源值字串）與 Asia/Taipei 資料日', () => {
    // 2026-07-07T06:30:00Z = 台北 2026-07-07 14:30（同日）
    const t = Date.UTC(2026, 6, 7, 6, 30) / 1000;
    expect(parseYahooFxRate(chartResponse(31.915, t))).toEqual({
      date: '2026-07-07',
      rate: '31.915',
    });
  });

  it('UTC 與台北跨日時取台北日曆日', () => {
    // 2026-07-06T22:00:00Z = 台北 2026-07-07 06:00（UTC 仍是 07-06）
    const t = Date.UTC(2026, 6, 6, 22, 0) / 1000;
    expect(parseYahooFxRate(chartResponse(31.9, t)).date).toBe('2026-07-07');
  });

  it('rate 保留來源數值的字串表示（不經浮點再加工）', () => {
    const t = Date.UTC(2026, 6, 7, 1, 0) / 1000;
    expect(parseYahooFxRate(chartResponse(29.05, t)).rate).toBe('29.05');
  });

  it.each([
    ['缺 price', chartResponse(undefined, Date.UTC(2026, 6, 7) / 1000)],
    ['price 非數值', chartResponse('31.9', Date.UTC(2026, 6, 7) / 1000)],
    ['price 為 0', chartResponse(0, Date.UTC(2026, 6, 7) / 1000)],
    ['price 為負', chartResponse(-1, Date.UTC(2026, 6, 7) / 1000)],
    ['缺時戳', chartResponse(31.9, undefined)],
    ['整體形狀不對', { chart: {} }],
    ['非物件', null],
  ])('fail loud：%s 擲出明確錯誤', (_label, json) => {
    expect(() => parseYahooFxRate(json)).toThrow(/Yahoo FX/);
  });
});
