import { describe, expect, it, jest, afterEach } from '@jest/globals';
import { yahooProvider } from './yahooProvider';
import { SymbolNotFoundError } from './quoteErrors';

/** 合法 chart 回應（meta 帶必要欄位；symbol 供標的身分護欄比對，省略＝缺值）。 */
function okChartJson(price = 100, symbol?: string): unknown {
  return {
    chart: {
      result: [
        {
          meta: {
            ...(symbol !== undefined ? { symbol } : {}),
            regularMarketPrice: price,
            regularMarketTime: 1_700_000_000,
            chartPreviousClose: 99,
          },
        },
      ],
    },
  };
}

function mockFetchOnce(status: number, json: unknown): jest.SpiedFunction<typeof fetch> {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
  } as Response);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('yahooProvider 錯誤分類', () => {
  it('HTTP 404 擲 SymbolNotFoundError（帶 market/symbol）', async () => {
    mockFetchOnce(404, {});
    const err = await yahooProvider.fetch('US', '0050').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SymbolNotFoundError);
    expect((err as SymbolNotFoundError).market).toBe('US');
    expect((err as SymbolNotFoundError).symbol).toBe('0050');
  });

  it('200 但 chart result 為空 → SymbolNotFoundError', async () => {
    mockFetchOnce(200, { chart: { result: [], error: null } });
    await expect(yahooProvider.fetch('US', '0050')).rejects.toBeInstanceOf(SymbolNotFoundError);
  });

  it('200 但 chart 缺 result → SymbolNotFoundError', async () => {
    mockFetchOnce(200, { chart: { error: { code: 'Not Found' } } });
    await expect(yahooProvider.fetch('US', 'NOPE')).rejects.toBeInstanceOf(SymbolNotFoundError);
  });

  it('HTTP 429 / 5xx 擲一般錯誤（非 SymbolNotFoundError）', async () => {
    mockFetchOnce(429, {});
    const err429 = await yahooProvider.fetch('TW', '0050').catch((e: unknown) => e);
    expect(err429).toBeInstanceOf(Error);
    expect(err429).not.toBeInstanceOf(SymbolNotFoundError);

    mockFetchOnce(502, {});
    const err5xx = await yahooProvider.fetch('TW', '0050').catch((e: unknown) => e);
    expect(err5xx).not.toBeInstanceOf(SymbolNotFoundError);
  });

  it('meta 存在但缺價 → 一般解析錯誤（非 SymbolNotFoundError）', async () => {
    mockFetchOnce(200, { chart: { result: [{ meta: { currency: 'USD' } }] } });
    const err = await yahooProvider.fetch('US', 'AAPL').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(SymbolNotFoundError);
  });

  it('合法回應正常解析', async () => {
    mockFetchOnce(200, okChartJson(123.45));
    const q = await yahooProvider.fetch('TW', '0050');
    expect(q.price).toBe(123.45);
  });
});

describe('yahooProvider 標的身分護欄（enable-crypto-quotes）', () => {
  it('200 但回錯標的 → SymbolNotFoundError、不放行錯價（原 bug：CRYPTO/BTC 撞同名 ETF）', async () => {
    // 修正前送 `BTC` 會拿到 NYSE Arca 同名 ETF（meta.symbol="BTC"、$28）；
    // 修正後請求 `BTC-USD`，模擬 Yahoo 仍回其他標的時必須擋下。
    mockFetchOnce(200, okChartJson(28.27, 'SOMETHING-ELSE'));
    await expect(yahooProvider.fetch('CRYPTO', 'BTC')).rejects.toBeInstanceOf(SymbolNotFoundError);
  });

  it('回傳標的與請求一致 → 放行（大小寫不敏感）', async () => {
    mockFetchOnce(200, okChartJson(64000, 'btc-usd'));
    const q = await yahooProvider.fetch('CRYPTO', 'BTC');
    expect(q.price).toBe(64000);
  });

  it('meta.symbol 缺值 → 跳過比對不誤殺（避免來源減欄位全面斷流）', async () => {
    mockFetchOnce(200, okChartJson(500));
    const q = await yahooProvider.fetch('US', 'AAPL');
    expect(q.price).toBe(500);
  });

  it('TW 市場一致性比對用完整 ySymbol（2330.TW）', async () => {
    mockFetchOnce(200, okChartJson(1000, '2330.TW'));
    const q = await yahooProvider.fetch('TW', '2330');
    expect(q.price).toBe(1000);
  });
});
