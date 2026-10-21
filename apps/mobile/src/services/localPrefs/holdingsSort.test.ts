import { DEFAULT_HOLDINGS_SORT, parseHoldingsSort, serializeHoldingsSort } from './holdingsSort';

describe('parseHoldingsSort', () => {
  it('round-trips a valid sort', () => {
    const s = { key: 'xirr', dir: 'asc' } as const;
    expect(parseHoldingsSort(serializeHoldingsSort(s))).toEqual(s);
  });

  it('accepts every column key', () => {
    for (const key of [
      'symbol',
      'mv',
      'ret',
      'unreal',
      'today',
      'price',
      'qty',
      'avg',
      'cost',
      'weight',
      'xirr',
    ]) {
      expect(parseHoldingsSort(JSON.stringify({ key, dir: 'desc' }))).toEqual({ key, dir: 'desc' });
    }
  });

  it('falls back to market value descending on bad input', () => {
    expect(DEFAULT_HOLDINGS_SORT).toEqual({ key: 'mv', dir: 'desc' });
    expect(parseHoldingsSort(undefined)).toEqual(DEFAULT_HOLDINGS_SORT);
    expect(parseHoldingsSort('not json')).toEqual(DEFAULT_HOLDINGS_SORT);
    expect(parseHoldingsSort(JSON.stringify({ key: 'nope', dir: 'asc' }))).toEqual(
      DEFAULT_HOLDINGS_SORT,
    );
    expect(parseHoldingsSort(JSON.stringify({ key: 'mv', dir: 'sideways' }))).toEqual(
      DEFAULT_HOLDINGS_SORT,
    );
    expect(parseHoldingsSort(JSON.stringify(null))).toEqual(DEFAULT_HOLDINGS_SORT);
    expect(parseHoldingsSort(JSON.stringify(['mv', 'desc']))).toEqual(DEFAULT_HOLDINGS_SORT);
  });
});
