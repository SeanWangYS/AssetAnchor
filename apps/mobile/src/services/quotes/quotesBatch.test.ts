import { buildFetchQuotesUrl, parseFetchQuotesResponse, resolveBatchTargets } from './quotesBatch';
import type { QuoteEntry, QuoteTarget } from './quotesStore';

const NOW = 1_700_000_000_000;

function entry(price: string, fetchedAtMs = NOW): QuoteEntry {
  return { price, prevClose: null, currency: 'TWD', fetchedAtMs };
}

describe('buildFetchQuotesUrl', () => {
  it('組多筆 items（整串 encode）', () => {
    const targets: QuoteTarget[] = [
      { market: 'TW', symbol: '2330', currency: 'TWD' },
      { market: 'US', symbol: 'AAPL', currency: 'USD' },
    ];
    const url = buildFetchQuotesUrl('http://x/fn', targets);
    // decode 後應為 items=TW:2330:TWD,US:AAPL:USD
    expect(decodeURIComponent(url)).toBe('http://x/fn/fetchQuotes?items=TW:2330:TWD,US:AAPL:USD');
  });
});

describe('parseFetchQuotesResponse', () => {
  it('解析 ok 回應 → quotes map（無 error 筆時 errors 為空）', () => {
    const json = {
      ok: true,
      quotes: [
        { symbolId: 'TW_2330', price: '2355', prevClose: '2400', fetchedAtMs: 123 },
        { symbolId: 'US_AAPL', price: '230', prevClose: null, fetchedAtMs: 456 },
      ],
    };
    expect(parseFetchQuotesResponse(json, NOW)).toEqual({
      quotes: {
        TW_2330: { price: '2355', prevClose: '2400', fetchedAtMs: 123 },
        US_AAPL: { price: '230', prevClose: null, fetchedAtMs: 456 },
      },
      errors: {},
    });
  });

  it('error 筆保留錯誤碼（symbol_not_found / transient）', () => {
    const json = {
      ok: true,
      quotes: [
        { symbolId: 'TW_2330', price: '2355', fetchedAtMs: 1 },
        { symbolId: 'US_0050', error: { code: 'symbol_not_found', message: '查無報價代號' } },
        { symbolId: 'US_QQQ', error: { code: 'transient', message: '報價暫時無法取得' } },
      ],
    };
    const parsed = parseFetchQuotesResponse(json, NOW);
    expect(Object.keys(parsed.quotes)).toEqual(['TW_2330']);
    expect(parsed.errors).toEqual({ US_0050: 'symbol_not_found', US_QQQ: 'transient' });
  });

  it('舊格式字串 error / 未知 code → fallback transient', () => {
    const json = {
      ok: true,
      quotes: [
        { symbolId: 'US_QQQ', error: '報價暫時無法取得' },
        { symbolId: 'US_VTI', error: { code: 'weird_future_code', message: 'x' } },
      ],
    };
    expect(parseFetchQuotesResponse(json, NOW).errors).toEqual({
      US_QQQ: 'transient',
      US_VTI: 'transient',
    });
  });

  it('缺 price 且無 error 的筆 → 略過（不進 quotes 也不進 errors）', () => {
    const json = { ok: true, quotes: [{ symbolId: 'US_VTI' }] };
    const parsed = parseFetchQuotesResponse(json, NOW);
    expect(parsed.quotes).toEqual({});
    expect(parsed.errors).toEqual({});
  });

  it('fetchedAtMs 缺 → 回退 nowMs', () => {
    const json = { ok: true, quotes: [{ symbolId: 'TW_2330', price: '2355' }] };
    expect(parseFetchQuotesResponse(json, NOW).quotes.TW_2330?.fetchedAtMs).toBe(NOW);
  });

  it('非 ok / 格式錯 → 空結果', () => {
    const empty = { quotes: {}, errors: {} };
    expect(parseFetchQuotesResponse({ ok: false, quotes: [] }, NOW)).toEqual(empty);
    expect(parseFetchQuotesResponse({ ok: true, quotes: 'nope' }, NOW)).toEqual(empty);
    expect(parseFetchQuotesResponse(null, NOW)).toEqual(empty);
    expect(parseFetchQuotesResponse('str', NOW)).toEqual(empty);
  });
});

describe('resolveBatchTargets（抓取結果 → 更新/錯誤決策）', () => {
  const t0050: QuoteTarget = { market: 'US', symbol: '0050', currency: 'TWD' };
  const t2330: QuoteTarget = { market: 'TW', symbol: '2330', currency: 'TWD' };

  it('抓到新值 → 進 updates、不標錯', () => {
    const r = resolveBatchTargets([t2330], { TW_2330: entry('2355') }, {}, {});
    expect(r.updates.TW_2330?.price).toBe('2355');
    expect(r.errorUpdates).toEqual({});
  });

  it('抓不到但有 stale fallback → 用過期值、不標錯（資料可用性優先）', () => {
    const stale = entry('2300', NOW - 60 * 60 * 1000);
    const r = resolveBatchTargets([t2330], {}, { TW_2330: stale }, { TW_2330: 'symbol_not_found' });
    expect(r.updates.TW_2330).toBe(stale);
    expect(r.errorUpdates).toEqual({});
  });

  it('完全無值且回報 symbol_not_found → 標錯', () => {
    const r = resolveBatchTargets([t0050], {}, {}, { US_0050: 'symbol_not_found' });
    expect(r.updates).toEqual({});
    expect(r.errorUpdates).toEqual({ US_0050: 'symbol_not_found' });
  });

  it('完全無值且無錯誤資訊 → 不標錯（維持 pending 語義）', () => {
    const r = resolveBatchTargets([t0050], {}, {}, {});
    expect(r.updates).toEqual({});
    expect(r.errorUpdates).toEqual({});
  });

  it('混合批次逐檔獨立決策', () => {
    const r = resolveBatchTargets(
      [t0050, t2330],
      { TW_2330: entry('2355') },
      {},
      { US_0050: 'symbol_not_found' },
    );
    expect(Object.keys(r.updates)).toEqual(['TW_2330']);
    expect(r.errorUpdates).toEqual({ US_0050: 'symbol_not_found' });
  });
});
