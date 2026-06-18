import { describe, expect, it } from '@jest/globals';
import { normalizeSymbolMeta, symbolDisplayName } from './symbolMeta.js';

describe('normalizeSymbolMeta', () => {
  it('擇優名稱：有 longName 時用 longName 並 trim', () => {
    const patch = normalizeSymbolMeta({ longName: '  Apple Inc.  ', shortName: 'Apple' });
    expect(patch.name).toBe('Apple Inc.');
  });

  it('擇優名稱：缺 longName 退 shortName', () => {
    const patch = normalizeSymbolMeta({ shortName: 'Apple' });
    expect(patch.name).toBe('Apple');
  });

  it('名稱兩者皆缺 → patch 不含 name 鍵（不覆寫既有）', () => {
    const patch = normalizeSymbolMeta({ exchange: 'NASDAQ' });
    expect('name' in patch).toBe(false);
  });

  it('全空白字串視為缺值 → 該欄位不納入 patch', () => {
    const patch = normalizeSymbolMeta({ longName: '   ', exchange: '\t' });
    expect('name' in patch).toBe(false);
    expect('exchange' in patch).toBe(false);
  });

  it('非字串型別（數字/物件/null）→ 該欄位不納入 patch', () => {
    const patch = normalizeSymbolMeta({
      longName: 123 as unknown,
      shortName: { x: 1 } as unknown,
      sector: null as unknown,
    });
    expect('name' in patch).toBe(false);
    expect('sector' in patch).toBe(false);
  });

  it('過長字串截斷到上限', () => {
    const long = 'A'.repeat(500);
    const patch = normalizeSymbolMeta({ longName: long });
    expect(patch.name).toBeDefined();
    expect(patch.name!.length).toBeLessThanOrEqual(120);
  });

  it('完整 payload → name/name_zh/exchange/industry/sector 皆整形', () => {
    const patch = normalizeSymbolMeta({
      longName: 'Taiwan Semiconductor',
      nameZh: '台積電',
      exchange: 'TWSE',
      industry: 'Semiconductors',
      sector: 'Technology',
    });
    expect(patch).toEqual({
      name: 'Taiwan Semiconductor',
      name_zh: '台積電',
      exchange: 'TWSE',
      industry: 'Semiconductors',
      sector: 'Technology',
    });
  });

  it('全缺/全無效 → 回空 patch（不拋例外）', () => {
    expect(normalizeSymbolMeta({})).toEqual({});
    expect(normalizeSymbolMeta({ longName: '', sector: 42 as unknown })).toEqual({});
  });
});

describe('symbolDisplayName', () => {
  it('name_zh 優先', () => {
    expect(symbolDisplayName({ name: 'Apple Inc.', name_zh: '蘋果' }, 'AAPL')).toBe('蘋果');
  });

  it('缺 name_zh 退 name', () => {
    expect(symbolDisplayName({ name: 'Apple Inc.' }, 'AAPL')).toBe('Apple Inc.');
  });

  it('name/name_zh 皆缺 → 退 raw symbol', () => {
    expect(symbolDisplayName({}, 'AAPL')).toBe('AAPL');
    expect(symbolDisplayName(null, '2330')).toBe('2330');
    expect(symbolDisplayName(undefined, 'QQQ')).toBe('QQQ');
  });

  it('全空白名稱視為缺值 → 退 raw symbol', () => {
    expect(symbolDisplayName({ name: '  ', name_zh: '' }, 'VTI')).toBe('VTI');
  });
});
