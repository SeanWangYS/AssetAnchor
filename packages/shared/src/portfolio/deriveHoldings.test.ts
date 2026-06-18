import { deriveHoldings, deriveRealizedEvents, sellableQuantity } from './deriveHoldings.js';
import { buildTransactionDoc } from '../transactions/buildTransactionDoc.js';
import { CurrencyMismatchError, InvalidMoneyValueError } from '../money/index.js';
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
  /** 預設 2024-01-15；SELL 時序測試用。 */
  date?: string;
}

/** 用已測過的 buildTransactionDoc 組 schema 一致的交易文件當 fixture。 */
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

  it('fails loud on corrupted money fields (data corruption)', () => {
    const broken = {
      ...buy({ symbol: '2330', market: 'TW', currency: 'TWD', quantity: '100', price: '500' }),
      total: 'Infinity',
    };
    expect(() => deriveHoldings([broken])).toThrow(InvalidMoneyValueError);
  });

  it('fails loud on mixed currencies within one (market, symbol)', () => {
    const txs = [
      buy({ symbol: '2330', market: 'TW', currency: 'TWD', quantity: '100', price: '500' }),
      buy({ symbol: '2330', market: 'TW', currency: 'USD', quantity: '100', price: '16' }),
    ];
    expect(() => deriveHoldings(txs)).toThrow(CurrencyMismatchError);
  });

  it('BUY-only position has realizedPnl 0', () => {
    const p = deriveHoldings(tsmcFixture())[0]!;
    expect(p.realizedPnl).toBe('0.0000000000');
  });
});

describe('deriveHoldings — SELL', () => {
  it('partial sell reduces quantity, keeps average cost unchanged', () => {
    // TSMC avg 550.76 / 2500；賣 1000 @600（晚於買入）
    const positions = deriveHoldings([
      ...tsmcFixture(),
      sell({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1000',
        price: '600',
        fee: '855',
        date: '2024-02-01',
      }),
    ]);
    const p = positions[0]!;
    expect(p.quantity).toBe('1500.0000000000');
    expect(p.averageCost).toBe('550.7600000000'); // 不變
    expect(p.totalCost).toBe('826140.0000000000'); // 550.76 × 1500
    // realized = (600×1000 − 855) − 550.76×1000 = 48385
    expect(p.realizedPnl).toBe('48385.0000000000');
  });

  it('full sell with no rebuy drops the position from the list', () => {
    const positions = deriveHoldings([
      buy({ symbol: '2330', market: 'TW', currency: 'TWD', quantity: '1000', price: '500' }),
      sell({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1000',
        price: '600',
        date: '2024-02-01',
      }),
    ]);
    expect(positions).toEqual([]);
  });

  it('sell-to-zero then rebuy starts a fresh cost cycle (no historical carry)', () => {
    const positions = deriveHoldings([
      buy({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1000',
        price: '500',
        date: '2024-01-01',
      }),
      sell({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1000',
        price: '600',
        date: '2024-01-02',
      }),
      buy({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '500',
        price: '550',
        date: '2024-01-03',
      }),
    ]);
    const p = positions[0]!;
    expect(p.quantity).toBe('500.0000000000');
    expect(p.averageCost).toBe('550.0000000000'); // 重算、不累加
    expect(p.totalCost).toBe('275000.0000000000');
    expect(p.realizedPnl).toBe('100000.0000000000'); // (600−500)×1000
  });

  it('processes chronologically by transaction_date, not array order', () => {
    // 陣列順序故意把 SELL 放前面；應依日期 buy(1/1) → sell(2/1)
    const positions = deriveHoldings([
      sell({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '400',
        price: '600',
        date: '2024-02-01',
      }),
      buy({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1000',
        price: '500',
        date: '2024-01-01',
      }),
    ]);
    expect(positions[0]!.quantity).toBe('600.0000000000');
    expect(positions[0]!.averageCost).toBe('500.0000000000');
  });

  it('fails loud on oversell (sold qty exceeds held)', () => {
    const txs = [
      buy({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1000',
        price: '500',
        date: '2024-01-01',
      }),
      sell({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1500',
        price: '600',
        date: '2024-02-01',
      }),
    ];
    expect(() => deriveHoldings(txs)).toThrow();
  });
});

describe('deriveRealizedEvents', () => {
  it('returns empty for no sells', () => {
    expect(deriveRealizedEvents(tsmcFixture())).toEqual([]);
  });

  it('computes §4 realized P&L for a sell', () => {
    const events = deriveRealizedEvents([
      ...tsmcFixture(),
      sell({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1000',
        price: '600',
        fee: '855',
        date: '2024-02-01',
      }),
    ]);
    expect(events).toHaveLength(1);
    const e = events[0]!;
    expect(e.market).toBe('TW');
    expect(e.symbol).toBe('2330');
    expect(e.currency).toBe('TWD');
    expect(e.transaction_date).toBe('2024-02-01');
    expect(e.realized).toBe('48385.0000000000');
  });

  it('zero-fee sell: realized = total − avgCost × qty', () => {
    const events = deriveRealizedEvents([
      buy({ symbol: 'AAPL', market: 'US', currency: 'USD', quantity: '10', price: '100' }),
      sell({
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        quantity: '10',
        price: '120',
        date: '2024-02-01',
      }),
    ]);
    // (120×10) − 100×10 = 200
    expect(events[0]!.realized).toBe('200.0000000000');
  });

  it('emits one event per sell, chronological', () => {
    const events = deriveRealizedEvents([
      buy({
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        quantity: '10',
        price: '100',
        date: '2024-01-01',
      }),
      sell({
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        quantity: '4',
        price: '120',
        date: '2024-02-01',
      }),
      sell({
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        quantity: '6',
        price: '130',
        date: '2024-03-01',
      }),
    ]);
    expect(events.map((e) => e.transaction_date)).toEqual(['2024-02-01', '2024-03-01']);
    expect(events[0]!.realized).toBe('80.0000000000'); // (120−100)×4
    expect(events[1]!.realized).toBe('180.0000000000'); // (130−100)×6
  });
});

describe('sellableQuantity', () => {
  it('returns held quantity for a held symbol', () => {
    expect(sellableQuantity(tsmcFixture(), 'TW', '2330')).toBe('2500.0000000000');
  });

  it('returns 0 for a symbol with no position', () => {
    expect(sellableQuantity(tsmcFixture(), 'US', 'AAPL')).toBe('0.0000000000');
  });

  it('returns 0 after a full sell (nothing left to sell)', () => {
    const txs = [
      buy({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1000',
        price: '500',
        date: '2024-01-01',
      }),
      sell({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1000',
        price: '600',
        date: '2024-02-01',
      }),
    ];
    expect(sellableQuantity(txs, 'TW', '2330')).toBe('0.0000000000');
  });
});

describe('deriveHoldings — 缺欄位 fail-soft（pre-ADR-0005 舊 doc）', () => {
  it('缺 total/fee/tax 的舊 doc 不丟 DecimalError，缺值視為 0', () => {
    const good = buy({
      symbol: 'AAPL',
      market: 'US',
      currency: 'USD',
      quantity: '10',
      price: '100',
    });
    const legacy = buy({
      symbol: 'AAPL',
      market: 'US',
      currency: 'USD',
      quantity: '5',
      price: '100',
    });
    const broken = { ...legacy } as Record<string, unknown>;
    delete broken.total;
    delete broken.fee;
    delete broken.tax;

    const input = [good, broken as unknown as TransactionDocument];
    expect(() => deriveHoldings(input)).not.toThrow();
    const pos = deriveHoldings(input).find((p) => p.symbol === 'AAPL');
    // good 貢獻 10 股 / 成本 1000；broken 缺金額視為 0 成本但仍 +5 股。
    expect(pos?.quantity).toBe('15.0000000000');
    expect(pos?.totalCost).toBe('1000.0000000000');
  });

  it('缺 quantity 也視為 0（該筆不增量、不丟）', () => {
    const legacy = buy({
      symbol: 'QQQ',
      market: 'US',
      currency: 'USD',
      quantity: '3',
      price: '50',
    });
    const broken = { ...legacy } as Record<string, unknown>;
    delete broken.quantity;
    expect(() => deriveHoldings([broken as unknown as TransactionDocument])).not.toThrow();
    // 缺 quantity → 0 股 → qty=0 不列入持倉。
    expect(deriveHoldings([broken as unknown as TransactionDocument])).toHaveLength(0);
  });
});
