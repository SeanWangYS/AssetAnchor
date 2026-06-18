import { buildFetchQuotesUrl, parseFetchQuotesResponse } from './quotesBatch';
import type { QuoteTarget } from './quotesStore';

const NOW = 1_700_000_000_000;

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
  it('解析 ok 回應 → symbolId map', () => {
    const json = {
      ok: true,
      quotes: [
        { symbolId: 'TW_2330', price: '2355', prevClose: '2400', fetchedAtMs: 123 },
        { symbolId: 'US_AAPL', price: '230', prevClose: null, fetchedAtMs: 456 },
      ],
    };
    expect(parseFetchQuotesResponse(json, NOW)).toEqual({
      TW_2330: { price: '2355', prevClose: '2400', fetchedAtMs: 123 },
      US_AAPL: { price: '230', prevClose: null, fetchedAtMs: 456 },
    });
  });

  it('略過 error 筆與缺 price 筆', () => {
    const json = {
      ok: true,
      quotes: [
        { symbolId: 'TW_2330', price: '2355', fetchedAtMs: 1 },
        { symbolId: 'US_QQQ', error: '報價暫時無法取得' },
        { symbolId: 'US_VTI' }, // 缺 price
      ],
    };
    expect(Object.keys(parseFetchQuotesResponse(json, NOW))).toEqual(['TW_2330']);
  });

  it('fetchedAtMs 缺 → 回退 nowMs', () => {
    const json = { ok: true, quotes: [{ symbolId: 'TW_2330', price: '2355' }] };
    expect(parseFetchQuotesResponse(json, NOW).TW_2330?.fetchedAtMs).toBe(NOW);
  });

  it('非 ok / 格式錯 → 空物件', () => {
    expect(parseFetchQuotesResponse({ ok: false, quotes: [] }, NOW)).toEqual({});
    expect(parseFetchQuotesResponse({ ok: true, quotes: 'nope' }, NOW)).toEqual({});
    expect(parseFetchQuotesResponse(null, NOW)).toEqual({});
    expect(parseFetchQuotesResponse('str', NOW)).toEqual({});
  });
});
