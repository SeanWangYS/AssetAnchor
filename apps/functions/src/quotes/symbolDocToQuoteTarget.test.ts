import { symbolDocToQuoteTarget } from './symbolDocToQuoteTarget';

describe('symbolDocToQuoteTarget', () => {
  it('合法 symbol 文件 → target', () => {
    expect(
      symbolDocToQuoteTarget({
        symbol_id: 'TW_2330',
        market: 'TW',
        symbol: '2330',
        currency: 'TWD',
      }),
    ).toEqual({ market: 'TW', symbol: '2330', currency: 'TWD' });
  });

  it('symbol 去空白 + 大寫', () => {
    expect(
      symbolDocToQuoteTarget({ market: 'US', symbol: ' aapl ', currency: 'USD' })?.symbol,
    ).toBe('AAPL');
  });

  it('undefined / 缺欄位 → null', () => {
    expect(symbolDocToQuoteTarget(undefined)).toBeNull();
    expect(symbolDocToQuoteTarget({ market: 'TW', symbol: '2330' })).toBeNull(); // 缺 currency
    expect(symbolDocToQuoteTarget({ symbol: '2330', currency: 'TWD' })).toBeNull(); // 缺 market
    expect(symbolDocToQuoteTarget({ market: 'TW', currency: 'TWD' })).toBeNull(); // 缺 symbol
  });

  it('非法 enum → null', () => {
    expect(symbolDocToQuoteTarget({ market: 'XX', symbol: 'A', currency: 'USD' })).toBeNull();
    expect(symbolDocToQuoteTarget({ market: 'US', symbol: 'A', currency: 'ZZZ' })).toBeNull();
  });
});
