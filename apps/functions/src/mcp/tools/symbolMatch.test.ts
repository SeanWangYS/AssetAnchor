import { rankSymbolCandidates, type SymbolRow } from './symbolMatch';

const sym = (market: SymbolRow['market'], symbol: string, name = '', name_zh = ''): SymbolRow => ({
  symbol_id: `${market}_${symbol}`,
  symbol,
  market,
  asset_type: 'STOCK',
  currency: market === 'TW' ? 'TWD' : 'USD',
  name,
  name_zh,
});

describe('rankSymbolCandidates', () => {
  const candidates = [
    sym('TW', '00500', 'Prefix ETF'),
    sym('TW', '0050', 'Yuanta Taiwan 50', '元大台灣50'),
    sym('TW', '2330', 'TSMC', '台積電'),
    sym('US', 'TSM', 'Taiwan Semiconductor ADR', '台積電ADR'),
  ];

  it('puts the exact symbol first, then prefix matches', () => {
    expect(rankSymbolCandidates('0050', candidates).map((c) => c.symbol_id)).toEqual([
      'TW_0050',
      'TW_00500',
    ]);
  });

  it('matches symbols case-insensitively', () => {
    expect(rankSymbolCandidates('tsm', candidates)[0]?.symbol_id).toBe('US_TSM');
  });

  it('matches Chinese and English names by substring', () => {
    expect(rankSymbolCandidates('台積電', candidates).map((c) => c.symbol_id)).toEqual([
      'TW_2330',
      'US_TSM',
    ]);
    expect(rankSymbolCandidates('taiwan', candidates).map((c) => c.symbol_id)).toEqual([
      'TW_0050',
      'US_TSM',
    ]);
  });

  it('restricts to a market when given', () => {
    expect(rankSymbolCandidates('台積電', candidates, 'TW').map((c) => c.symbol_id)).toEqual([
      'TW_2330',
    ]);
  });

  it('drops duplicates and caps at 10', () => {
    const many = Array.from({ length: 15 }, (_, i) => sym('US', `AB${i}`));
    expect(rankSymbolCandidates('AB', [...many, ...many])).toHaveLength(10);
  });

  it('returns nothing for an empty query', () => {
    expect(rankSymbolCandidates('  ', candidates)).toEqual([]);
  });
});
