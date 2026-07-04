import { parseHistoryInput, MAX_HISTORY_ITEMS } from './parseHistoryInput';

describe('parseHistoryInput', () => {
  it('解析 market:symbol:currency:from（含 FX pseudo-symbol）', () => {
    const r = parseHistoryInput({
      items: 'TW:2330:TWD:2024-01-10,FX:USDTWD:TWD:2024-01-10',
    });
    expect(r).toEqual({
      ok: true,
      items: [
        { market: 'TW', symbol: '2330', currency: 'TWD', from: '2024-01-10' },
        { market: 'FX', symbol: 'USDTWD', currency: 'TWD', from: '2024-01-10' },
      ],
    });
  });

  it('非法 market / currency / from 格式的項剔除，不整批失敗', () => {
    const r = parseHistoryInput({
      items: 'JP:7203:JPY:2024-01-10,US:AAPL:USD:not-a-date,US:VTI:USD:2024-06-03',
    });
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.items).toEqual([
        { market: 'US', symbol: 'VTI', currency: 'USD', from: '2024-06-03' },
      ]);
  });

  it('重複 (market,symbol) 去重、symbol 正規化大寫', () => {
    const r = parseHistoryInput({ items: 'US:aapl:USD:2024-01-10,US:AAPL:USD:2024-02-10' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.items).toHaveLength(1);
  });

  it('空 / 全非法 / 超上限 → ok:false', () => {
    expect(parseHistoryInput({}).ok).toBe(false);
    expect(parseHistoryInput({ items: 'XX:1:YY:zz' }).ok).toBe(false);
    const many = Array.from(
      { length: MAX_HISTORY_ITEMS + 1 },
      (_, i) => `US:S${i}:USD:2024-01-01`,
    ).join(',');
    expect(parseHistoryInput({ items: many }).ok).toBe(false);
  });
});
