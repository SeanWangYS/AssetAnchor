import { priceHistoryDocumentSchema, HISTORY_MARKETS } from './priceHistory.js';
import { MARKETS } from '../enums/markets.js';

const validDoc = {
  symbol_id: 'TW_2330',
  market: 'TW',
  symbol: '2330',
  currency: 'TWD',
  year: 2025,
  closes: { '2025-01-02': '1085.0000000000' },
  adjcloses: { '2025-01-02': '1085.0000000000' },
  last_date: '2025-01-02',
  source: 'yahoo-finance',
};

describe('HISTORY_MARKETS', () => {
  it('＝交易域 MARKETS + FX（不動 Market enum）', () => {
    expect(HISTORY_MARKETS).toEqual([...MARKETS, 'FX']);
  });
});

describe('priceHistoryDocumentSchema', () => {
  it('合法文件通過（含 FX pseudo-symbol）', () => {
    expect(priceHistoryDocumentSchema.safeParse(validDoc).success).toBe(true);
    expect(
      priceHistoryDocumentSchema.safeParse({
        ...validDoc,
        symbol_id: 'FX_USDTWD',
        market: 'FX',
        symbol: 'USDTWD',
      }).success,
    ).toBe(true);
  });

  it('closes key 非 YYYY-MM-DD 被拒', () => {
    expect(
      priceHistoryDocumentSchema.safeParse({
        ...validDoc,
        closes: { '2025/01/02': '1085.0000000000' },
      }).success,
    ).toBe(false);
  });

  it('未知 market 被拒', () => {
    expect(priceHistoryDocumentSchema.safeParse({ ...validDoc, market: 'JP' }).success).toBe(false);
  });
});
