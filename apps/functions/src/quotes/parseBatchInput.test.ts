import { parseBatchInput, MAX_BATCH_ITEMS } from './parseBatchInput';

describe('parseBatchInput', () => {
  it('解析多筆合法項', () => {
    const r = parseBatchInput({ items: 'TW:2330:TWD,US:AAPL:USD' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.items).toEqual([
        { market: 'TW', symbol: '2330', currency: 'TWD' },
        { market: 'US', symbol: 'AAPL', currency: 'USD' },
      ]);
    }
  });

  it('symbol 去空白 + 大寫', () => {
    const r = parseBatchInput({ items: 'US: aapl :USD' });
    expect(r.ok && r.items[0]?.symbol).toBe('AAPL');
  });

  it('剔除非法項、保留合法項（不整批失敗）', () => {
    const r = parseBatchInput({ items: 'TW:2330:TWD,XX:BAD:ZZZ,US:AAPL:USD' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.items.map((i) => i.symbol)).toEqual(['2330', 'AAPL']);
  });

  it('重複 (market,symbol) 去重', () => {
    const r = parseBatchInput({ items: 'TW:2330:TWD,TW:2330:TWD' });
    expect(r.ok && r.items.length).toBe(1);
  });

  it('全數非法 → ok:false', () => {
    expect(parseBatchInput({ items: 'XX:BAD:ZZZ' }).ok).toBe(false);
  });

  it('空 items → ok:false', () => {
    expect(parseBatchInput({}).ok).toBe(false);
    expect(parseBatchInput({ items: '' }).ok).toBe(false);
  });

  it('超過上限 → ok:false', () => {
    const many = Array.from({ length: MAX_BATCH_ITEMS + 1 }, (_, i) => `US:S${i}:USD`).join(',');
    expect(parseBatchInput({ items: many }).ok).toBe(false);
  });
});
