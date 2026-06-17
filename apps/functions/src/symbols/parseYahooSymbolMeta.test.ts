import { parseQuoteSummaryMeta, parseChartMeta } from './parseYahooSymbolMeta';

/** 精簡 quoteSummary 回應（錄製 fixture，不打外網）。 */
const QS_FULL = {
  quoteSummary: {
    result: [
      {
        price: {
          longName: 'Taiwan Semiconductor Manufacturing Company Limited',
          shortName: 'Taiwan Semiconductor Manufacturing',
          exchangeName: 'Taiwan',
        },
        assetProfile: { industry: 'Semiconductors', sector: 'Technology' },
        quoteType: { exchange: 'TAI', longName: 'Taiwan Semiconductor', shortName: 'TSM' },
      },
    ],
    error: null,
  },
};

const CHART_FULL = {
  chart: {
    result: [
      {
        meta: {
          longName: 'Apple Inc.',
          shortName: 'Apple',
          fullExchangeName: 'NasdaqGS',
          exchangeName: 'NMS',
        },
      },
    ],
  },
};

describe('parseQuoteSummaryMeta', () => {
  it('攤平 price/assetProfile 候選欄位', () => {
    const raw = parseQuoteSummaryMeta(QS_FULL);
    expect(raw).toEqual({
      longName: 'Taiwan Semiconductor Manufacturing Company Limited',
      shortName: 'Taiwan Semiconductor Manufacturing',
      exchange: 'Taiwan',
      industry: 'Semiconductors',
      sector: 'Technology',
    });
  });

  it('price 缺名稱時退 quoteType 的名稱', () => {
    const raw = parseQuoteSummaryMeta({
      quoteSummary: {
        result: [
          { price: { exchangeName: 'Taiwan' }, quoteType: { longName: 'Taiwan Semiconductor' } },
        ],
        error: null,
      },
    });
    expect(raw?.longName).toBe('Taiwan Semiconductor');
  });

  it('result 缺/空 → null', () => {
    expect(parseQuoteSummaryMeta({ quoteSummary: { result: [], error: null } })).toBeNull();
    expect(parseQuoteSummaryMeta({})).toBeNull();
    expect(parseQuoteSummaryMeta(null)).toBeNull();
  });
});

describe('parseChartMeta', () => {
  it('攤平 chart meta 為名稱 + 交易所（無 industry/sector）', () => {
    const raw = parseChartMeta(CHART_FULL);
    expect(raw).toEqual({
      longName: 'Apple Inc.',
      shortName: 'Apple',
      exchange: 'NasdaqGS',
    });
  });

  it('fullExchangeName 缺時退 exchangeName', () => {
    const raw = parseChartMeta({
      chart: { result: [{ meta: { shortName: 'Apple', exchangeName: 'NMS' } }] },
    });
    expect(raw?.exchange).toBe('NMS');
  });

  it('meta 缺 → null', () => {
    expect(parseChartMeta({ chart: { result: [] } })).toBeNull();
    expect(parseChartMeta(null)).toBeNull();
  });
});
