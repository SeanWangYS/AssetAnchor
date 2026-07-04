import { parseYahooHistory, localDateOf } from './parseYahooHistory';

/** 最小 Yahoo v8 chart 歷史回應 fixture。 */
function yahooJson(opts: {
  granularity?: string;
  timezone?: string;
  timestamps?: number[];
  closes?: (number | null)[];
  adjcloses?: (number | null)[];
}): unknown {
  return {
    chart: {
      result: [
        {
          meta: {
            dataGranularity: opts.granularity ?? '1d',
            exchangeTimezoneName: opts.timezone ?? 'Asia/Taipei',
            regularMarketPrice: 100,
          },
          timestamp: opts.timestamps ?? [],
          indicators: {
            quote: [{ close: opts.closes ?? [] }],
            adjclose: [{ adjclose: opts.adjcloses ?? opts.closes ?? [] }],
          },
        },
      ],
    },
  };
}

// 2025-01-02 13:30 台北收盤 bar（epoch 秒）
const TPE_BAR = Math.floor(Date.UTC(2025, 0, 2, 5, 30) / 1000);
// 2025-01-02 16:00 紐約收盤 bar＝UTC 21:00（美東冬令 UTC-5）
const NY_BAR = Math.floor(Date.UTC(2025, 0, 2, 21, 0) / 1000);

describe('localDateOf', () => {
  it('依交易所時區換算 YYYY-MM-DD', () => {
    expect(localDateOf(TPE_BAR * 1000, 'Asia/Taipei')).toBe('2025-01-02');
    // UTC 21:00 在台北已是隔天、在紐約仍是當天
    expect(localDateOf(NY_BAR * 1000, 'Asia/Taipei')).toBe('2025-01-03');
    expect(localDateOf(NY_BAR * 1000, 'America/New_York')).toBe('2025-01-02');
  });
});

describe('parseYahooHistory', () => {
  it('正常日線：等長 bars、日期以交易所時區換算、adjclose 帶出', () => {
    const parsed = parseYahooHistory(
      yahooJson({
        timestamps: [TPE_BAR, TPE_BAR + 86400],
        closes: [1085.5, 1090],
        adjcloses: [1080.1, 1090],
      }),
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.granularity).toBe('1d');
    expect(parsed?.bars).toEqual([
      { ts: TPE_BAR, date: '2025-01-02', close: 1085.5, adjclose: 1080.1 },
      { ts: TPE_BAR + 86400, date: '2025-01-03', close: 1090, adjclose: 1090 },
    ]);
  });

  it('null close 保留 null（交由消費端 forward-fill / 剔除）', () => {
    const parsed = parseYahooHistory(
      yahooJson({ timestamps: [TPE_BAR, TPE_BAR + 86400], closes: [null, 32.1] }),
    );
    expect(parsed?.bars.map((b) => b.close)).toEqual([null, 32.1]);
  });

  it('granularity 原樣帶出（呼叫端驗 1d，防 range=max 靜默降級月線）', () => {
    const parsed = parseYahooHistory(yahooJson({ granularity: '1mo', timestamps: [], closes: [] }));
    expect(parsed?.granularity).toBe('1mo');
  });

  it('缺 meta / result 回 null', () => {
    expect(parseYahooHistory({})).toBeNull();
    expect(parseYahooHistory({ chart: { result: [] } })).toBeNull();
  });

  it('無效 timezone 以 UTC 換算（防禦）', () => {
    const parsed = parseYahooHistory(
      yahooJson({ timezone: 'Not/A_Zone', timestamps: [TPE_BAR], closes: [1] }),
    );
    expect(parsed?.bars[0]?.date).toBe('2025-01-02'); // UTC 05:30
  });
});
