import { buildCashFlows, type DatedFlow } from './cashFlows.js';
import { buildTransactionDoc } from '../transactions/buildTransactionDoc.js';
import type { Market } from '../enums/index.js';
import type { FirestoreTimestamp, TransactionDocument } from '../types/index.js';

const ts: FirestoreTimestamp = { seconds: 0, nanoseconds: 0, toDate: () => new Date(0) };
let seq = 0;

function tx(
  type: 'BUY' | 'SELL',
  o: {
    symbol: string;
    market: Market;
    currency: 'USD' | 'TWD' | 'USDT';
    quantity: string;
    price: string;
    date: string;
    fee?: string;
    tax?: string;
    account?: string;
  },
): TransactionDocument {
  seq += 1;
  const doc = buildTransactionDoc(
    {
      account_id: o.account ?? 'acc_1',
      symbol: o.symbol,
      market: o.market,
      asset_type: 'STOCK',
      transaction_type: type,
      transaction_date: o.date,
      currency: o.currency,
      quantity: o.quantity,
      price: o.price,
      fee: o.fee ?? '0',
      tax: o.tax ?? '0',
      notes: '',
    },
    { transactionId: `txn_${seq}` },
  );
  return { ...doc, created_at: ts, updated_at: ts };
}

const flat = (flows: DatedFlow[]) =>
  flows.map((f) => [f.date, f.amount.toDecimalString(), f.amount.currency]);

const tsmcBuy = tx('BUY', {
  symbol: '2330',
  market: 'TW',
  currency: 'TWD',
  quantity: '1000',
  price: '590',
  date: '2024-03-14',
  fee: '840',
});
const tsmcSell = tx('SELL', {
  symbol: '2330',
  market: 'TW',
  currency: 'TWD',
  quantity: '500',
  price: '2200',
  date: '2025-05-01',
  fee: '1567',
  tax: '3300',
});
const aaplBuy = tx('BUY', {
  symbol: 'AAPL',
  market: 'US',
  currency: 'USD',
  quantity: '25',
  price: '168.45',
  date: '2024-04-08',
});

describe('buildCashFlows', () => {
  it('uses fee-inclusive cost for buys and net proceeds for sells', () => {
    const r = buildCashFlows({
      transactions: [tsmcSell, tsmcBuy],
      displayCurrency: 'TWD',
      fxUsdTwdCloses: {},
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(flat(r.flows)).toEqual([
      ['2024-03-14', '-590840.0000000000', 'TWD'],
      ['2025-05-01', '1095133.0000000000', 'TWD'],
    ]);
  });

  it('converts USD flows at the transaction-date close, not the latest rate', () => {
    const r = buildCashFlows({
      transactions: [aaplBuy],
      displayCurrency: 'TWD',
      fxUsdTwdCloses: { '2024-04-08': '32', '2026-10-20': '32.595' },
    });
    expect(r.ok && flat(r.flows)).toEqual([['2024-04-08', '-134760.0000000000', 'TWD']]);
  });

  it('converts TWD flows into USD at the transaction-date close', () => {
    const r = buildCashFlows({
      transactions: [tsmcBuy],
      displayCurrency: 'USD',
      fxUsdTwdCloses: { '2024-03-14': '31.6' },
    });
    // 590,840 x 0.0316455696 (10-dp canonical TWD->USD rate of 31.6)
    expect(r.ok && flat(r.flows)).toEqual([['2024-03-14', '-18697.4683424640', 'USD']]);
  });

  it('forward-fills holidays from the previous close', () => {
    const r = buildCashFlows({
      transactions: [aaplBuy],
      displayCurrency: 'TWD',
      fxUsdTwdCloses: { '2024-04-05': '31.9', '2024-04-09': '40' },
    });
    expect(r.ok && flat(r.flows)).toEqual([['2024-04-08', '-134338.8750000000', 'TWD']]);
  });

  it('falls back to the next close when no earlier close exists', () => {
    const r = buildCashFlows({
      transactions: [aaplBuy],
      displayCurrency: 'TWD',
      fxUsdTwdCloses: { '2024-04-10': '32', '2024-05-01': '40' },
    });
    expect(r.ok && flat(r.flows)).toEqual([['2024-04-08', '-134760.0000000000', 'TWD']]);
  });

  it('pegs USDT 1:1 to USD', () => {
    const usdtBuy = tx('BUY', {
      symbol: 'BTC',
      market: 'CRYPTO',
      currency: 'USDT',
      quantity: '0.1',
      price: '60000',
      date: '2024-04-08',
    });
    const r = buildCashFlows({
      transactions: [usdtBuy],
      displayCurrency: 'TWD',
      fxUsdTwdCloses: { '2024-04-08': '32' },
    });
    expect(r.ok && flat(r.flows)).toEqual([['2024-04-08', '-192000.0000000000', 'TWD']]);
  });

  it('reports fx_unavailable when a conversion is needed but the series is empty', () => {
    expect(
      buildCashFlows({ transactions: [aaplBuy], displayCurrency: 'TWD', fxUsdTwdCloses: {} }),
    ).toEqual({ ok: false, reason: 'fx_unavailable' });
  });

  it('needs no FX when every flow is already in the display currency', () => {
    const r = buildCashFlows({
      transactions: [tsmcBuy],
      displayCurrency: 'TWD',
      fxUsdTwdCloses: {},
    });
    expect(r.ok).toBe(true);
  });

  it('filters by market and symbol', () => {
    const r = buildCashFlows({
      transactions: [tsmcBuy, aaplBuy, tsmcSell],
      displayCurrency: 'TWD',
      fxUsdTwdCloses: { '2024-04-08': '32' },
      filter: { market: 'TW', symbol: '2330' },
    });
    expect(r.ok && r.flows.map((f) => f.date)).toEqual(['2024-03-14', '2025-05-01']);
  });

  it('ignores non-BUY/SELL transactions and sorts by date', () => {
    const dividend = { ...tsmcBuy, transaction_type: 'DIVIDEND_CASH' as const };
    const r = buildCashFlows({
      transactions: [tsmcSell, dividend, aaplBuy, tsmcBuy],
      displayCurrency: 'TWD',
      fxUsdTwdCloses: { '2024-04-08': '32' },
    });
    expect(r.ok && r.flows.map((f) => f.date)).toEqual(['2024-03-14', '2024-04-08', '2025-05-01']);
  });

  describe('accountIds filter', () => {
    const inA = tx('BUY', {
      symbol: '2330',
      market: 'TW',
      currency: 'TWD',
      quantity: '1',
      price: '500',
      date: '2022-04-21',
      account: 'acc_A',
    });
    const inB = tx('BUY', {
      symbol: '2330',
      market: 'TW',
      currency: 'TWD',
      quantity: '1',
      price: '1000',
      date: '2025-07-21',
      account: 'acc_B',
    });
    const otherInA = tx('BUY', {
      symbol: '0050',
      market: 'TW',
      currency: 'TWD',
      quantity: '1',
      price: '100',
      date: '2023-01-01',
      account: 'acc_A',
    });
    const base = {
      transactions: [inA, inB, otherInA],
      displayCurrency: 'TWD' as const,
      fxUsdTwdCloses: {},
    };

    it('keeps only the listed account', () => {
      const r = buildCashFlows({
        ...base,
        filter: { market: 'TW', symbol: '2330', accountIds: ['acc_A'] },
      });
      expect(r.ok && flat(r.flows)).toEqual([['2022-04-21', '-500.0000000000', 'TWD']]);
    });

    it('accepts a set of accounts (e.g. the unassigned bucket)', () => {
      const r = buildCashFlows({
        ...base,
        filter: { market: 'TW', symbol: '2330', accountIds: ['acc_A', 'acc_B'] },
      });
      expect(r.ok && r.flows.map((f) => f.date)).toEqual(['2022-04-21', '2025-07-21']);
    });

    it('returns no flows for an empty account set', () => {
      const r = buildCashFlows({
        ...base,
        filter: { market: 'TW', symbol: '2330', accountIds: [] },
      });
      expect(r.ok && r.flows).toEqual([]);
    });
  });
});
