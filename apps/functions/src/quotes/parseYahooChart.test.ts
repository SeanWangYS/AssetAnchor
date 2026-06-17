import { parseYahooChart, toYahooSymbol } from './parseYahooChart';

/** 精簡但具代表性的 Yahoo v8 chart meta 回應（錄製 fixture，不打外網）。 */
const AAPL_FIXTURE = {
  chart: {
    result: [
      {
        meta: {
          currency: 'USD',
          symbol: 'AAPL',
          regularMarketPrice: 192.53,
          chartPreviousClose: 190.4,
          regularMarketOpen: 191.1,
          regularMarketDayHigh: 193.0,
          regularMarketDayLow: 190.8,
          regularMarketVolume: 51234567,
          regularMarketTime: 1718000000,
        },
        indicators: { quote: [{}] },
      },
    ],
    error: null,
  },
};

describe('parseYahooChart', () => {
  it('extracts price + OHLC + prevClose + volume + timestamp from meta', () => {
    const q = parseYahooChart(AAPL_FIXTURE);
    expect(q).not.toBeNull();
    expect(q!.price).toBe(192.53);
    expect(q!.open).toBe(191.1);
    expect(q!.high).toBe(193.0);
    expect(q!.low).toBe(190.8);
    expect(q!.prevClose).toBe(190.4);
    expect(q!.volume).toBe(51234567);
    expect(q!.sourceTimestampSec).toBe(1718000000);
  });

  it('falls back to previousClose when chartPreviousClose absent', () => {
    const j = { chart: { result: [{ meta: { regularMarketPrice: 10, previousClose: 9.5 } }] } };
    expect(parseYahooChart(j)!.prevClose).toBe(9.5);
  });

  it('returns null when price missing or response malformed', () => {
    expect(parseYahooChart({ chart: { result: [{ meta: {} }] } })).toBeNull();
    expect(parseYahooChart({ chart: { result: [] } })).toBeNull();
    expect(parseYahooChart({})).toBeNull();
    expect(parseYahooChart(null)).toBeNull();
  });

  it('nulls non-finite optional fields rather than passing them through', () => {
    const j = {
      chart: { result: [{ meta: { regularMarketPrice: 100, regularMarketVolume: 'x' } }] },
    };
    const q = parseYahooChart(j)!;
    expect(q.price).toBe(100);
    expect(q.volume).toBeNull();
  });
});

describe('toYahooSymbol', () => {
  it('suffixes TW symbols with .TW', () => {
    expect(toYahooSymbol('TW', '2330')).toBe('2330.TW');
  });
  it('leaves US symbols as-is', () => {
    expect(toYahooSymbol('US', 'AAPL')).toBe('AAPL');
  });
});
