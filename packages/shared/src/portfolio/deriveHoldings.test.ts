import { deriveHoldings } from './deriveHoldings.js';
import { buildTransactionDoc } from '../transactions/buildTransactionDoc.js';
import { CurrencyMismatchError } from '../money/index.js';
import type { Market } from '../enums/index.js';
import type { FirestoreTimestamp, TransactionDocument } from '../types/index.js';

const ts: FirestoreTimestamp = { seconds: 0, nanoseconds: 0, toDate: () => new Date(0) };

let seq = 0;

/** 用已測過的 buildTransactionDoc 組 schema 一致的 BUY 文件當 fixture。 */
function buy(opts: {
  symbol: string;
  market: Market;
  currency: 'USD' | 'TWD';
  quantity: string;
  price: string;
  fee?: string;
  tax?: string;
  accountId?: string;
}): TransactionDocument {
  seq += 1;
  const doc = buildTransactionDoc(
    {
      account_id: opts.accountId ?? 'acc_1',
      symbol: opts.symbol,
      market: opts.market,
      asset_type: 'STOCK',
      transaction_type: 'BUY',
      transaction_date: '2024-01-15',
      original_currency: opts.currency,
      quantity: opts.quantity,
      price: opts.price,
      fee: opts.fee ?? '0',
      tax: opts.tax ?? '0',
      notes: '',
    },
    { transactionId: `txn_${seq}` },
  );
  return { ...doc, created_at: ts, updated_at: ts };
}

/** §4 worked example：台積電三筆買入。 */
function tsmcFixture(): TransactionDocument[] {
  return [
    buy({
      symbol: '2330',
      market: 'TW',
      currency: 'TWD',
      quantity: '1000',
      price: '500',
      fee: '700',
    }),
    buy({
      symbol: '2330',
      market: 'TW',
      currency: 'TWD',
      quantity: '1000',
      price: '600',
      fee: '800',
    }),
    buy({
      symbol: '2330',
      market: 'TW',
      currency: 'TWD',
      quantity: '500',
      price: '550',
      fee: '400',
    }),
  ];
}

describe('deriveHoldings', () => {
  it('returns empty array for no transactions', () => {
    expect(deriveHoldings([])).toEqual([]);
  });

  it('matches the §4 TSMC worked example (avg = 550.76)', () => {
    const positions = deriveHoldings(tsmcFixture());
    expect(positions).toHaveLength(1);
    const p = positions[0]!;
    expect(p.market).toBe('TW');
    expect(p.symbol).toBe('2330');
    expect(p.currency).toBe('TWD');
    expect(p.quantity).toBe('2500.0000000000');
    expect(p.totalCost).toBe('1376900.0000000000');
    expect(p.averageCost).toBe('550.7600000000');
    expect(p.txCount).toBe(3);
  });

  it('aggregates the same (market, symbol) across different accounts', () => {
    const positions = deriveHoldings([
      buy({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1000',
        price: '500',
        accountId: 'acc_a',
      }),
      buy({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '500',
        price: '500',
        accountId: 'acc_b',
      }),
    ]);
    expect(positions).toHaveLength(1);
    expect(positions[0]!.quantity).toBe('1500.0000000000');
    expect(positions[0]!.txCount).toBe(2);
  });

  it('keeps different symbols as separate positions', () => {
    const positions = deriveHoldings([
      buy({ symbol: '2330', market: 'TW', currency: 'TWD', quantity: '100', price: '500' }),
      buy({ symbol: 'AAPL', market: 'US', currency: 'USD', quantity: '10', price: '180.5' }),
    ]);
    expect(positions).toHaveLength(2);
  });

  it('includes fee AND tax in totalCost (cost basis)', () => {
    const positions = deriveHoldings([
      buy({
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        quantity: '10',
        price: '100',
        fee: '1.5',
        tax: '0.5',
      }),
    ]);
    // 10×100 + 1.5 + 0.5 = 1002
    expect(positions[0]!.totalCost).toBe('1002.0000000000');
    expect(positions[0]!.averageCost).toBe('100.2000000000');
  });

  it('handles zero-commission brokers (fee=0, tax=0)', () => {
    const positions = deriveHoldings([
      buy({ symbol: 'AAPL', market: 'US', currency: 'USD', quantity: '10', price: '180.5' }),
    ]);
    expect(positions[0]!.totalCost).toBe('1805.0000000000');
    expect(positions[0]!.averageCost).toBe('180.5000000000');
  });

  it('keeps decimal precision on non-terminating division (ROUND_HALF_UP)', () => {
    const positions = deriveHoldings([
      buy({ symbol: 'VT', market: 'US', currency: 'USD', quantity: '3', price: '33.3333333333' }),
    ]);
    // totalCost = 99.9999999999；averageCost = 33.3333333333
    expect(positions[0]!.averageCost).toBe('33.3333333333');
  });

  it('sorts deterministically: market asc, then symbol asc', () => {
    const positions = deriveHoldings([
      buy({ symbol: 'VT', market: 'US', currency: 'USD', quantity: '1', price: '100' }),
      buy({ symbol: '2330', market: 'TW', currency: 'TWD', quantity: '1', price: '500' }),
      buy({ symbol: 'AAPL', market: 'US', currency: 'USD', quantity: '1', price: '180' }),
      buy({ symbol: '0050', market: 'TW', currency: 'TWD', quantity: '1', price: '140' }),
    ]);
    expect(positions.map((p) => `${p.market}_${p.symbol}`)).toEqual([
      'TW_0050',
      'TW_2330',
      'US_AAPL',
      'US_VT',
    ]);
  });

  it('is deterministic for the same input', () => {
    const txs = tsmcFixture();
    expect(deriveHoldings(txs)).toEqual(deriveHoldings(txs));
  });

  it('ignores non-BUY transactions (defensive; MVP data is BUY-only)', () => {
    const sell = {
      ...buy({ symbol: '2330', market: 'TW', currency: 'TWD', quantity: '100', price: '600' }),
      transaction_type: 'SELL' as const,
    };
    const positions = deriveHoldings([...tsmcFixture(), sell]);
    expect(positions[0]!.quantity).toBe('2500.0000000000');
    expect(positions[0]!.txCount).toBe(3);
  });

  it('fails loud when amounts is missing the original currency entry (data corruption)', () => {
    const broken = {
      ...buy({ symbol: '2330', market: 'TW', currency: 'TWD', quantity: '100', price: '500' }),
      amounts: {},
    };
    expect(() => deriveHoldings([broken])).toThrow(/缺少原幣別/);
  });

  it('fails loud on mixed currencies within one (market, symbol)', () => {
    const txs = [
      buy({ symbol: '2330', market: 'TW', currency: 'TWD', quantity: '100', price: '500' }),
      buy({ symbol: '2330', market: 'TW', currency: 'USD', quantity: '100', price: '16' }),
    ];
    expect(() => deriveHoldings(txs)).toThrow(CurrencyMismatchError);
  });
});
