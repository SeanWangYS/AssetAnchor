import {
  deriveHoldings,
  deriveHoldingsForAccountSafe,
  sellableQuantityForAccount,
} from './deriveHoldings.js';
import { buildTransactionDoc } from '../transactions/buildTransactionDoc.js';
import type { Market } from '../enums/index.js';
import type { FirestoreTimestamp, TransactionDocument } from '../types/index.js';

const ts: FirestoreTimestamp = { seconds: 0, nanoseconds: 0, toDate: () => new Date(0) };

let seq = 0;

interface TxOpts {
  symbol: string;
  market: Market;
  currency: 'USD' | 'TWD';
  quantity: string;
  price: string;
  fee?: string;
  tax?: string;
  accountId?: string;
  date?: string;
}

function tx(type: 'BUY' | 'SELL', opts: TxOpts): TransactionDocument {
  seq += 1;
  const doc = buildTransactionDoc(
    {
      account_id: opts.accountId ?? 'acc_1',
      symbol: opts.symbol,
      market: opts.market,
      asset_type: 'STOCK',
      transaction_type: type,
      transaction_date: opts.date ?? '2024-01-15',
      currency: opts.currency,
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

const buy = (opts: TxOpts): TransactionDocument => tx('BUY', opts);
const sell = (opts: TxOpts): TransactionDocument => tx('SELL', opts);

describe('sellableQuantityForAccount', () => {
  it('returns the holding quantity of the given account only', () => {
    const txs = [
      buy({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '2500',
        price: '500',
        accountId: 'acc_a',
      }),
    ];
    expect(sellableQuantityForAccount(txs, 'acc_a', 'TW', '2330')).toBe('2500.0000000000');
  });

  it('does NOT share sellable quantity across accounts (same symbol, different account)', () => {
    // 同一 symbol 2330：acc_a 持有 1000、acc_b 持有 500。
    const txs = [
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
    ];
    expect(sellableQuantityForAccount(txs, 'acc_a', 'TW', '2330')).toBe('1000.0000000000');
    expect(sellableQuantityForAccount(txs, 'acc_b', 'TW', '2330')).toBe('500.0000000000');
  });

  it('returns 0 when the account never held the symbol (even if another account holds it)', () => {
    const txs = [
      buy({
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        quantity: '10',
        price: '180',
        accountId: 'acc_a',
      }),
    ];
    // acc_b 從未持有 AAPL → 可賣 0（不可借 acc_a 的持倉）。
    expect(sellableQuantityForAccount(txs, 'acc_b', 'US', 'AAPL')).toBe('0.0000000000');
  });

  it('returns 0 after the account fully sold its position', () => {
    const txs = [
      buy({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1000',
        price: '500',
        accountId: 'acc_a',
        date: '2024-01-01',
      }),
      sell({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1000',
        price: '600',
        accountId: 'acc_a',
        date: '2024-02-01',
      }),
    ];
    expect(sellableQuantityForAccount(txs, 'acc_a', 'TW', '2330')).toBe('0.0000000000');
  });

  it('only counts the same account, reflecting partial sells', () => {
    const txs = [
      buy({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '2500',
        price: '500',
        accountId: 'acc_a',
        date: '2024-01-01',
      }),
      sell({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1000',
        price: '600',
        accountId: 'acc_a',
        date: '2024-02-01',
      }),
      // 別帳戶持倉不影響 acc_a 的可賣量。
      buy({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '9999',
        price: '500',
        accountId: 'acc_b',
        date: '2024-01-01',
      }),
    ];
    expect(sellableQuantityForAccount(txs, 'acc_a', 'TW', '2330')).toBe('1500.0000000000');
  });
});

describe('deriveHoldingsForAccountSafe', () => {
  it('returns empty positions and no skipped for no transactions', () => {
    expect(deriveHoldingsForAccountSafe([], 'acc_a')).toEqual({ positions: [], skipped: [] });
  });

  it('equals whole-account deriveHoldings (same result + order) when no bad data', () => {
    const txs = [
      buy({
        symbol: 'VT',
        market: 'US',
        currency: 'USD',
        quantity: '1',
        price: '100',
        accountId: 'acc_a',
      }),
      buy({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1',
        price: '500',
        accountId: 'acc_a',
      }),
      buy({
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        quantity: '1',
        price: '180',
        accountId: 'acc_a',
      }),
      // 別帳戶交易應被忽略。
      buy({
        symbol: 'QQQ',
        market: 'US',
        currency: 'USD',
        quantity: '1',
        price: '400',
        accountId: 'acc_b',
      }),
    ];
    const safe = deriveHoldingsForAccountSafe(txs, 'acc_a');
    const expected = deriveHoldings(txs.filter((t) => t.account_id === 'acc_a'));
    expect(safe.skipped).toEqual([]);
    expect(safe.positions).toEqual(expected);
    // 同序（market asc, symbol asc）。
    expect(safe.positions.map((p) => `${p.market}_${p.symbol}`)).toEqual([
      'TW_2330',
      'US_AAPL',
      'US_VT',
    ]);
  });

  it('skips only the offending symbol on account-level oversell, computes the rest', () => {
    const txs = [
      // 合法持股：TSLA、AAPL、VTI。
      buy({
        symbol: 'TSLA',
        market: 'US',
        currency: 'USD',
        quantity: '5',
        price: '200',
        accountId: 'acc_a',
      }),
      buy({
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        quantity: '10',
        price: '180',
        accountId: 'acc_a',
      }),
      buy({
        symbol: 'VTI',
        market: 'US',
        currency: 'USD',
        quantity: '3',
        price: '220',
        accountId: 'acc_a',
      }),
      // orphan SELL：acc_a 從未買 QQQ，卻記了一筆賣出 → 帳戶層級超賣。
      sell({
        symbol: 'QQQ',
        market: 'US',
        currency: 'USD',
        quantity: '1',
        price: '400',
        accountId: 'acc_a',
        date: '2024-03-01',
      }),
    ];
    const { positions, skipped } = deriveHoldingsForAccountSafe(txs, 'acc_a');
    expect(positions.map((p) => p.symbol).sort()).toEqual(['AAPL', 'TSLA', 'VTI']);
    expect(skipped).toEqual([{ market: 'US', symbol: 'QQQ' }]);
  });

  it('isolates failures per (market, symbol) — multiple good symbols survive one bad one', () => {
    const txs = [
      buy({
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        quantity: '10',
        price: '180',
        accountId: 'acc_a',
      }),
      // 帳戶層級超賣（買 1、賣 5）。
      buy({
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        quantity: '1',
        price: '500',
        accountId: 'acc_a',
        date: '2024-01-01',
      }),
      sell({
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        quantity: '5',
        price: '600',
        accountId: 'acc_a',
        date: '2024-02-01',
      }),
    ];
    const { positions, skipped } = deriveHoldingsForAccountSafe(txs, 'acc_a');
    expect(positions).toHaveLength(1);
    expect(positions[0]!.symbol).toBe('AAPL');
    expect(skipped).toEqual([{ market: 'US', symbol: 'NVDA' }]);
  });

  it('skips a symbol whose group mixes currencies (corrupt data) without dropping the rest', () => {
    const txs = [
      buy({
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        quantity: '10',
        price: '180',
        accountId: 'acc_a',
      }),
      // 同 (US, BAD) 混幣別 → deriveHoldings throw CurrencyMismatch。
      buy({
        symbol: 'BAD',
        market: 'US',
        currency: 'USD',
        quantity: '1',
        price: '100',
        accountId: 'acc_a',
      }),
      buy({
        symbol: 'BAD',
        market: 'US',
        currency: 'TWD',
        quantity: '1',
        price: '100',
        accountId: 'acc_a',
      }),
    ];
    const { positions, skipped } = deriveHoldingsForAccountSafe(txs, 'acc_a');
    expect(positions.map((p) => p.symbol)).toEqual(['AAPL']);
    expect(skipped).toEqual([{ market: 'US', symbol: 'BAD' }]);
  });
});
