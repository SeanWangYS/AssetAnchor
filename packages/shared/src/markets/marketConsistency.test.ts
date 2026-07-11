import { describe, expect, it } from '@jest/globals';
import {
  CRYPTO_TRANSACTION_CURRENCIES,
  defaultCurrencyForMarket,
  expectedCurrencyForMarket,
  quoteCurrencyForMarket,
  symbolLooksLikeMarketMismatch,
} from './marketConsistency.js';

describe('expectedCurrencyForMarket', () => {
  it('TW → TWD、US → USD', () => {
    expect(expectedCurrencyForMarket('TW')).toBe('TWD');
    expect(expectedCurrencyForMarket('US')).toBe('USD');
  });

  it('CRYPTO / OTHER 不約束（回 null）——硬擋語義不因 crypto 預設而改變', () => {
    expect(expectedCurrencyForMarket('CRYPTO')).toBeNull();
    expect(expectedCurrencyForMarket('OTHER')).toBeNull();
  });
});

describe('defaultCurrencyForMarket', () => {
  it('TW → TWD、US → USD（與硬擋一致）', () => {
    expect(defaultCurrencyForMarket('TW')).toBe('TWD');
    expect(defaultCurrencyForMarket('US')).toBe('USD');
  });

  it('CRYPTO → USD（表單預設；使用者仍可改 USDT / TWD）', () => {
    expect(defaultCurrencyForMarket('CRYPTO')).toBe('USD');
  });

  it('OTHER → null（表單不動）', () => {
    expect(defaultCurrencyForMarket('OTHER')).toBeNull();
  });
});

describe('quoteCurrencyForMarket', () => {
  it('TW → TWD、US → USD（與交易幣別硬擋一致）', () => {
    expect(quoteCurrencyForMarket('TW', 'TWD')).toBe('TWD');
    expect(quoteCurrencyForMarket('US', 'USD')).toBe('USD');
  });

  it('CRYPTO → 恆 USD（報價幣別與交易幣別分離——TWD/USDT 記帳的 lot 報價仍是 USD）', () => {
    expect(quoteCurrencyForMarket('CRYPTO', 'TWD')).toBe('USD');
    expect(quoteCurrencyForMarket('CRYPTO', 'USDT')).toBe('USD');
    expect(quoteCurrencyForMarket('CRYPTO', 'USD')).toBe('USD');
  });

  it('OTHER → fallback（無市場級約定，沿用呼叫端提供的幣別）', () => {
    expect(quoteCurrencyForMarket('OTHER', 'TWD')).toBe('TWD');
    expect(quoteCurrencyForMarket('OTHER', 'USD')).toBe('USD');
  });
});

describe('CRYPTO_TRANSACTION_CURRENCIES', () => {
  it('允許集恰為 USD / USDT / TWD', () => {
    expect(CRYPTO_TRANSACTION_CURRENCIES).toEqual(['USD', 'USDT', 'TWD']);
  });

  it('runtime frozen', () => {
    expect(Object.isFrozen(CRYPTO_TRANSACTION_CURRENCIES)).toBe(true);
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
