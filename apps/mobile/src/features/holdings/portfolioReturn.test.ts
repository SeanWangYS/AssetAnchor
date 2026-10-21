import {
  Money,
  buildTransactionDoc,
  type FirestoreTimestamp,
  type Market,
  type TransactionDocument,
} from '@assetanchor/shared';
import { computePortfolioReturn, type ReturnHero } from './portfolioReturn';

const ts: FirestoreTimestamp = { seconds: 0, nanoseconds: 0, toDate: () => new Date(0) };
let seq = 0;

function buy(o: {
  symbol: string;
  market: Market;
  currency: 'TWD' | 'USD';
  quantity: string;
  price: string;
  date: string;
}): TransactionDocument {
  seq += 1;
  const doc = buildTransactionDoc(
    {
      account_id: 'acc_1',
      symbol: o.symbol,
      market: o.market,
      asset_type: 'STOCK',
      transaction_type: 'BUY',
      transaction_date: o.date,
      currency: o.currency,
      quantity: o.quantity,
      price: o.price,
      fee: '0',
      tax: '0',
      notes: '',
    },
    { transactionId: `txn_${seq}` },
  );
  return { ...doc, created_at: ts, updated_at: ts };
}

const TODAY = '2026-10-21';
const tsmc = buy({
  symbol: '2330',
  market: 'TW',
  currency: 'TWD',
  quantity: '1000',
  price: '590',
  date: '2024-03-14',
});
const aapl = buy({
  symbol: 'AAPL',
  market: 'US',
  currency: 'USD',
  quantity: '25',
  price: '168.45',
  date: '2024-04-08',
});

const hero = (value: string, over: Partial<ReturnHero> = {}): ReturnHero => ({
  valueMoney: new Money(value, 'TWD'),
  pendingCount: 0,
  notFoundCount: 0,
  ...over,
});

const fxChunks = (years: number[]) =>
  Object.fromEntries(
    years.map((y) => [`FX_USDTWD_${y}`, { year: y, closes: { [`${y}-04-08`]: '32' } }]),
  );

describe('computePortfolioReturn', () => {
  it('annualizes a TWD-only portfolio without needing FX history', () => {
    const r = computePortfolioReturn({
      transactions: [tsmc],
      chunks: {},
      fxBackfilling: false,
      hero: hero('2405000'),
      displayCurrency: 'TWD',
      today: TODAY,
    });
    expect(r?.kind).toBe('annualized');
    expect(Number(r?.rate)).toBeGreaterThan(0.5);
  });

  it('returns null while any holding lacks a quote', () => {
    const base = {
      transactions: [tsmc],
      chunks: {},
      fxBackfilling: false,
      displayCurrency: 'TWD' as const,
      today: TODAY,
    };
    expect(computePortfolioReturn({ ...base, hero: hero('1', { pendingCount: 1 }) })).toBeNull();
    expect(computePortfolioReturn({ ...base, hero: hero('1', { notFoundCount: 1 }) })).toBeNull();
    expect(computePortfolioReturn({ ...base, hero: null })).toBeNull();
  });

  it('waits until every FX year from the first USD trade to today is loaded', () => {
    const base = {
      transactions: [tsmc, aapl],
      fxBackfilling: false,
      hero: hero('2850000'),
      displayCurrency: 'TWD' as const,
      today: TODAY,
    };
    expect(computePortfolioReturn({ ...base, chunks: fxChunks([2024, 2026]) })).toBeNull();
    expect(computePortfolioReturn({ ...base, chunks: fxChunks([2024, 2025, 2026]) })?.kind).toBe(
      'annualized',
    );
  });

  it('returns null while FX history is still backfilling', () => {
    expect(
      computePortfolioReturn({
        transactions: [aapl],
        chunks: fxChunks([2024, 2025, 2026]),
        fxBackfilling: true,
        hero: hero('450000'),
        displayCurrency: 'TWD',
        today: TODAY,
      }),
    ).toBeNull();
  });

  it('returns null without any trades', () => {
    expect(
      computePortfolioReturn({
        transactions: [],
        chunks: {},
        fxBackfilling: false,
        hero: hero('0'),
        displayCurrency: 'TWD',
        today: TODAY,
      }),
    ).toBeNull();
  });

  it('returns null when FX chunks exist but hold no closes', () => {
    const empty = Object.fromEntries(
      [2024, 2025, 2026].map((y) => [`FX_USDTWD_${y}`, { year: y, closes: {} }]),
    );
    expect(
      computePortfolioReturn({
        transactions: [aapl],
        chunks: empty,
        fxBackfilling: false,
        hero: hero('450000'),
        displayCurrency: 'TWD',
        today: TODAY,
      }),
    ).toBeNull();
  });

  it('finds the earliest USD trade regardless of order and ignores non-trades', () => {
    const later = buy({
      symbol: 'AAPL',
      market: 'US',
      currency: 'USD',
      quantity: '1',
      price: '200',
      date: '2025-06-01',
    });
    const dividend = {
      ...aapl,
      transaction_type: 'DIVIDEND_CASH' as const,
      transaction_date: '2023-01-01',
    };
    const base = {
      transactions: [later, dividend, aapl],
      fxBackfilling: false,
      hero: hero('500000'),
      displayCurrency: 'TWD' as const,
      today: TODAY,
    };
    // 2024 is required (from aapl), 2023 is not (dividend ignored).
    expect(computePortfolioReturn({ ...base, chunks: fxChunks([2025, 2026]) })).toBeNull();
    expect(
      computePortfolioReturn({ ...base, chunks: fxChunks([2024, 2025, 2026]) }),
    ).not.toBeNull();
  });
});
