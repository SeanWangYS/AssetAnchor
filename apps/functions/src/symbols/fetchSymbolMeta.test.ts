import { parseInput } from './fetchSymbolMeta';

const base = { market: 'US', symbol: 'AAPL', assetType: 'STOCK', currency: 'USD' };

describe('fetchSymbolMeta parseInput', () => {
  it('合法參數通過並正規化 symbol 大寫', () => {
    const r = parseInput({ ...base, symbol: ' aapl ' });
    expect(r).toEqual({ ok: true, input: { ...base, symbol: 'AAPL' } });
  });

  it('market / assetType / currency 不合法時擋下', () => {
    expect(parseInput({ ...base, market: 'XX' }).ok).toBe(false);
    expect(parseInput({ ...base, assetType: 'NOPE' }).ok).toBe(false);
    expect(parseInput({ ...base, currency: 'XYZ' }).ok).toBe(false);
  });

  it('CRYPTO 的 currency 一律 coerce 為 USD——報價幣別恆 USD（enable-crypto-quotes D4）', () => {
    for (const currency of ['USDT', 'TWD', 'USD']) {
      const r = parseInput({ market: 'CRYPTO', symbol: 'BTC', assetType: 'CRYPTO', currency });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.input.currency).toBe('USD');
    }
  });

  it('CRYPTO coerce 不放行白名單外的 currency（仍先過驗證）', () => {
    expect(
      parseInput({ market: 'CRYPTO', symbol: 'BTC', assetType: 'CRYPTO', currency: 'XYZ' }).ok,
    ).toBe(false);
  });
});
