import {
  validateFilter,
  queryTransactions,
  encodeCursor,
  decodeCursor,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type TxRow,
} from './transactionQuery';

const tx = (id: string, date: string, over: Partial<TxRow> = {}): TxRow => ({
  transaction_id: id,
  account_id: 'A1',
  transaction_date: date,
  symbol: '2330',
  market: 'TW',
  asset_type: 'STOCK',
  transaction_type: 'BUY',
  currency: 'TWD',
  quantity: '1000.0000000000',
  price: '580.0000000000',
  fee: '0.0000000000',
  tax: '0.0000000000',
  notes: '',
  import_batch_id: null,
  ...over,
});

describe('validateFilter', () => {
  it('accepts an empty filter', () => {
    expect(validateFilter({})).toBeNull();
  });

  it('rejects malformed dates', () => {
    expect(validateFilter({ date_from: '2025/01/01' })).toBe('日期需為 YYYY-MM-DD');
    expect(validateFilter({ date_to: '2025-02-30' })).toBe('日期需為 YYYY-MM-DD');
  });

  it('rejects a reversed range', () => {
    expect(validateFilter({ date_from: '2025-12-31', date_to: '2025-01-01' })).toBe(
      '起始日期不可晚於結束日期',
    );
  });

  it('rejects a corrupted cursor', () => {
    expect(validateFilter({ cursor: 'not-a-cursor' })).toBe('分頁游標無效，請從第一頁重新查詢');
  });
});

describe('cursor', () => {
  it('round-trips the last row position', () => {
    const c = encodeCursor({ d: '2025-03-01', id: 't9' });
    expect(decodeCursor(c)).toEqual({ d: '2025-03-01', id: 't9' });
  });
});

describe('queryTransactions', () => {
  const rows = [
    tx('a', '2025-01-05'),
    tx('b', '2025-03-01', { symbol: 'AAPL', market: 'US', currency: 'USD' }),
    tx('c', '2024-12-31'),
    tx('d', '2025-03-01'),
    tx('e', '2025-02-10', { account_id: 'A2' }),
  ];

  it('sorts newest first with a stable tie-break on id', () => {
    expect(queryTransactions(rows, {}).items.map((r) => r.transaction_id)).toEqual([
      'd',
      'b',
      'e',
      'a',
      'c',
    ]);
  });

  it('filters by symbol case-insensitively and by market', () => {
    const r = queryTransactions(rows, { symbol: 'aapl', market: 'US' });
    expect(r.items.map((x) => x.transaction_id)).toEqual(['b']);
  });

  it('filters by account', () => {
    expect(
      queryTransactions(rows, { account_id: 'A2' }).items.map((x) => x.transaction_id),
    ).toEqual(['e']);
  });

  it('filters by import batch', () => {
    const batch = [tx('x', '2025-01-01', { import_batch_id: 'imp_1' }), tx('y', '2025-01-01')];
    expect(
      queryTransactions(batch, { import_batch_id: 'imp_1' }).items.map((r) => r.transaction_id),
    ).toEqual(['x']);
  });

  it('includes both ends of the date range', () => {
    const r = queryTransactions(rows, { date_from: '2025-01-05', date_to: '2025-02-10' });
    expect(r.items.map((x) => x.transaction_id)).toEqual(['e', 'a']);
  });

  it('pages with a cursor until exhausted', () => {
    const first = queryTransactions(rows, { limit: 2 });
    expect(first.items.map((x) => x.transaction_id)).toEqual(['d', 'b']);
    expect(first.next_cursor).toEqual(expect.any(String));
    const second = queryTransactions(rows, { limit: 2, cursor: first.next_cursor! });
    expect(second.items.map((x) => x.transaction_id)).toEqual(['e', 'a']);
    const third = queryTransactions(rows, { limit: 2, cursor: second.next_cursor! });
    expect(third.items.map((x) => x.transaction_id)).toEqual(['c']);
    expect(third.next_cursor).toBeNull();
  });

  it('defaults to 50 per page and caps at 100', () => {
    const many = Array.from({ length: 130 }, (_, i) =>
      tx(`t${String(i).padStart(3, '0')}`, '2025-01-01'),
    );
    expect(queryTransactions(many, {}).items).toHaveLength(DEFAULT_PAGE_SIZE);
    expect(queryTransactions(many, { limit: 500 }).items).toHaveLength(MAX_PAGE_SIZE);
  });

  it('returns decimal strings untouched', () => {
    expect(queryTransactions([tx('a', '2025-01-01')], {}).items[0]?.price).toBe('580.0000000000');
  });
});
