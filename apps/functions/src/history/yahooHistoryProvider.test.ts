import { rangeBucketFor, toYahooHistorySymbol, INTRADAY_PARAMS } from './yahooHistoryProvider';

describe('toYahooHistorySymbol', () => {
  it('台股加 .TW、美股原樣、FX pseudo-symbol 轉 =X', () => {
    expect(toYahooHistorySymbol('TW', '2330')).toBe('2330.TW');
    expect(toYahooHistorySymbol('US', 'AAPL')).toBe('AAPL');
    expect(toYahooHistorySymbol('FX', 'USDTWD')).toBe('TWD=X');
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
