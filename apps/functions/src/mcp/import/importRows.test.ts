import { assessImport, normalizeImportRow, type ImportRowInput } from './importRows';
import type { TransactionDocument } from '@assetanchor/shared';

const input = (over: Partial<ImportRowInput> = {}): ImportRowInput => ({
  transaction_date: '2025-01-02',
  symbol: '2330',
  market: 'TW',
  transaction_type: 'BUY',
  quantity: '1000',
  price: '580',
  ...over,
});

const existingTx = (over: Partial<TransactionDocument> = {}) =>
  ({
    transaction_id: 'e1',
    account_id: 'acc-a',
    transaction_date: '2024-12-01',
    symbol: '2330',
    market: 'TW',
    asset_type: 'STOCK',
    transaction_type: 'BUY',
    currency: 'TWD',
    quantity: '1000.0000000000',
    price: '500.0000000000',
    total: '500000.0000000000',
    fee: '0.0000000000',
    tax: '0.0000000000',
    notes: '',
    ...over,
  }) as TransactionDocument;

describe('normalizeImportRow', () => {
  it('fills defaults and normalizes numbers to Money strings', () => {
    const r = normalizeImportRow(input(), 'acc-a');
    expect(r).toMatchObject({
      ok: true,
      row: {
        transaction_date: '2025-01-02',
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
        keep_duplicate: false,
      },
    });
  });

  it('uppercases symbols and defaults US to USD', () => {
    const r = normalizeImportRow(input({ symbol: 'aapl', market: 'US', price: '190.5' }), 'acc-a');
    expect(r.ok && r.row).toMatchObject({
      symbol: 'AAPL',
      currency: 'USD',
      price: '190.5000000000',
    });
  });

  it("reuses the app form's 繁中 validation messages", () => {
    const r = normalizeImportRow(input({ currency: 'USD' }), 'acc-a');
    expect(r).toEqual({ ok: false, error: '台股交易幣別須為 TWD' });
    expect(normalizeImportRow(input({ transaction_date: '2025-02-30' }), 'acc-a')).toEqual({
      ok: false,
      error: '日期需為 YYYY-MM-DD',
    });
  });

  it('rejects unsupported transaction types', () => {
    const r = normalizeImportRow(input({ transaction_type: 'DIVIDEND_CASH' }), 'acc-a');
    expect(r).toEqual({ ok: false, error: '目前只支援買入（BUY）與賣出（SELL）' });
  });
});

describe('assessImport', () => {
  const symbols = new Map([['TW_2330', 'exists' as const]]);

  it('marks a clean batch ok', () => {
    const rows = [input(), input({ transaction_date: '2025-01-03' })].map((r) =>
      normalizeImportRow(r, 'acc-a'),
    );
    const report = assessImport({ rows, existing: [], symbols });
    expect(report.map((r) => r.status)).toEqual(['ok', 'ok']);
  });

  it('flags invalid, duplicate and oversell rows', () => {
    const rows = [
      input({ transaction_date: '2024-12-01', price: '500' }),
      input({ currency: 'USD' }),
      input({ transaction_type: 'SELL', quantity: '5000', transaction_date: '2025-02-01' }),
    ].map((r) => normalizeImportRow(r, 'acc-a'));
    const report = assessImport({ rows, existing: [existingTx()], symbols });
    expect(report.map((r) => [r.status, r.message])).toEqual([
      ['duplicate', '與既有交易或本批前面的列重複'],
      ['invalid', '台股交易幣別須為 TWD'],
      ['oversell', '超賣：此帳戶當時可賣 1000，欲賣 5000'],
    ]);
  });

  it('keeps a duplicate the user chose to keep, and counts it toward holdings', () => {
    const rows = [
      input({ transaction_date: '2024-12-01', price: '500', keep_duplicate: true }),
      input({ transaction_type: 'SELL', quantity: '2000', transaction_date: '2025-02-01' }),
    ].map((r) => normalizeImportRow(r, 'acc-a'));
    const report = assessImport({ rows, existing: [existingTx()], symbols });
    expect(report.map((r) => r.status)).toEqual(['ok', 'ok']);
    expect(report[0]?.duplicate).toBe(true);
  });

  it('marks new symbols and rejects symbols that cannot be found', () => {
    const rows = [input({ symbol: '0050' }), input({ symbol: 'ZZZZ', market: 'US' })].map((r) =>
      normalizeImportRow(r, 'acc-a'),
    );
    const report = assessImport({
      rows,
      existing: [],
      symbols: new Map([
        ['TW_0050', 'new' as const],
        ['US_ZZZZ', 'missing' as const],
      ]),
    });
    expect(report.map((r) => [r.status, r.new_symbol])).toEqual([
      ['ok', true],
      ['invalid', false],
    ]);
    expect(report[1]?.message).toBe('找不到此代號，請確認代號與市場（若確定正確，請稍後再試）');
  });
});
