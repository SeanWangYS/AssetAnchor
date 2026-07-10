import { describe, expect, it } from '@jest/globals';
import { expectedCurrencyForMarket, symbolLooksLikeMarketMismatch } from './marketConsistency.js';

describe('expectedCurrencyForMarket', () => {
  it('TW → TWD、US → USD', () => {
    expect(expectedCurrencyForMarket('TW')).toBe('TWD');
    expect(expectedCurrencyForMarket('US')).toBe('USD');
  });

  it('CRYPTO / OTHER 不約束（回 null）', () => {
    expect(expectedCurrencyForMarket('CRYPTO')).toBeNull();
    expect(expectedCurrencyForMarket('OTHER')).toBeNull();
  });
});

describe('symbolLooksLikeMarketMismatch', () => {
  it('US 市場 × 台股樣式代號（數字開頭）→ true', () => {
    expect(symbolLooksLikeMarketMismatch('US', '0050')).toBe(true);
    expect(symbolLooksLikeMarketMismatch('US', '2330')).toBe(true);
    expect(symbolLooksLikeMarketMismatch('US', '00631L')).toBe(true);
  });

  it('TW 市場 × 純英文字母代號 → true', () => {
    expect(symbolLooksLikeMarketMismatch('TW', 'VOO')).toBe(true);
    expect(symbolLooksLikeMarketMismatch('TW', 'AAPL')).toBe(true);
  });

  it('樣式相符 → false', () => {
    expect(symbolLooksLikeMarketMismatch('US', 'VOO')).toBe(false);
    expect(symbolLooksLikeMarketMismatch('US', 'BRK.B')).toBe(false);
    expect(symbolLooksLikeMarketMismatch('TW', '2330')).toBe(false);
    expect(symbolLooksLikeMarketMismatch('TW', '00631L')).toBe(false);
  });

  it('CRYPTO / OTHER 市場不判斷 → false', () => {
    expect(symbolLooksLikeMarketMismatch('CRYPTO', 'BTC')).toBe(false);
    expect(symbolLooksLikeMarketMismatch('OTHER', '9988')).toBe(false);
  });

  it('空字串 / 空白 → false（尚未輸入不警告）', () => {
    expect(symbolLooksLikeMarketMismatch('US', '')).toBe(false);
    expect(symbolLooksLikeMarketMismatch('TW', '  ')).toBe(false);
  });
});
