import { jest, afterEach } from '@jest/globals';
import {
  rangeBucketFor,
  toYahooHistorySymbol,
  yahooHistoryProvider,
  INTRADAY_PARAMS,
} from './yahooHistoryProvider';

describe('toYahooHistorySymbol', () => {
  it('台股加 .TW、美股原樣、FX pseudo-symbol 轉 =X', () => {
    expect(toYahooHistorySymbol('TW', '2330')).toBe('2330.TW');
    expect(toYahooHistorySymbol('US', 'AAPL')).toBe('AAPL');
    expect(toYahooHistorySymbol('FX', 'USDTWD')).toBe('TWD=X');
  });

  it('CRYPTO 加 -USD（寫死 USD；enable-crypto-quotes）', () => {
    expect(toYahooHistorySymbol('CRYPTO', 'BTC')).toBe('BTC-USD');
    expect(toYahooHistorySymbol('CRYPTO', 'ETH')).toBe('ETH-USD');
  });
});

describe('rangeBucketFor', () => {
  it('挑最小涵蓋的有界 bucket（禁 max）', () => {
    expect(rangeBucketFor(3)).toBe('5d');
    expect(rangeBucketFor(20)).toBe('1mo');
    expect(rangeBucketFor(200)).toBe('1y');
    expect(rangeBucketFor(400)).toBe('2y');
    expect(rangeBucketFor(4000)).toBe('10y'); // 超過 10 年以 10y 為上限（MVP 邊界）
  });
});

describe('INTRADAY_PARAMS', () => {
  it('1D=1d/5m、1W=5d/30m（ADR-0010 D5）', () => {
    expect(INTRADAY_PARAMS['1D']).toEqual({ range: '1d', interval: '5m' });
    expect(INTRADAY_PARAMS['1W']).toEqual({ range: '5d', interval: '30m' });
  });
});

/** 最小合法歷史回應（meta.symbol 供身分護欄；缺省＝不帶）。 */
function historyJson(symbol?: string): unknown {
  return {
    chart: {
      result: [
        {
          meta: {
            ...(symbol !== undefined ? { symbol } : {}),
            dataGranularity: '1d',
            exchangeTimezoneName: 'UTC',
            regularMarketPrice: 100,
          },
          timestamp: [1_700_000_000],
          indicators: { quote: [{ close: [64000] }], adjclose: [{ adjclose: [64000] }] },
        },
      ],
    },
  };
}

function mockFetchOnce(json: unknown): void {
  jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => json,
  } as Response);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('yahooHistoryProvider 標的身分護欄（enable-crypto-quotes）', () => {
  it('200 但回錯標的 → fail loud、不落地', async () => {
    mockFetchOnce(historyJson('SOMETHING-ELSE'));
    await expect(yahooHistoryProvider.fetchDaily('CRYPTO', 'BTC', 0, 86_400)).rejects.toThrow(
      /標的不符/,
    );
  });

  it('回傳標的一致 → 正常回 bars（大小寫不敏感）', async () => {
    mockFetchOnce(historyJson('btc-usd'));
    const bars = await yahooHistoryProvider.fetchDaily('CRYPTO', 'BTC', 0, 86_400);
    expect(bars).toHaveLength(1);
    expect(bars[0]?.close).toBe(64000);
  });

  it('meta.symbol 缺值 → 跳過比對不誤殺', async () => {
    mockFetchOnce(historyJson());
    const bars = await yahooHistoryProvider.fetchDaily('US', 'AAPL', 0, 86_400);
    expect(bars).toHaveLength(1);
  });
});
