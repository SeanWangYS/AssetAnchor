import { buildTransactionDoc } from './buildTransactionDoc.js';
import type { TransactionInput } from '../schemas/transaction.js';
import { InvalidMoneyValueError } from '../money/index.js';

const baseInput: TransactionInput = {
  account_id: 'acc_1',
  symbol: 'AAPL',
  market: 'US',
  asset_type: 'STOCK',
  transaction_type: 'BUY',
  transaction_date: '2024-01-15',
  original_currency: 'USD',
  quantity: '10',
  price: '180.5',
  fee: '1.25',
  tax: '0.5',
  notes: 'hi',
};

const ctx = { transactionId: 'txn_1' };

describe('buildTransactionDoc', () => {
  it('copies identity / event fields and writes transaction_id from ctx', () => {
    const doc = buildTransactionDoc(baseInput, ctx);
    expect(doc.transaction_id).toBe('txn_1');
    expect(doc.account_id).toBe('acc_1');
    expect(doc.symbol).toBe('AAPL');
    expect(doc.market).toBe('US');
    expect(doc.asset_type).toBe('STOCK');
    expect(doc.transaction_type).toBe('BUY');
    expect(doc.transaction_date).toBe('2024-01-15');
    expect(doc.original_currency).toBe('USD');
    expect(doc.notes).toBe('hi');
  });

  it('leaves reserved fields null and marks status COMPLETE', () => {
    const doc = buildTransactionDoc(baseInput, ctx);
    expect(doc.ex_date).toBeNull();
    expect(doc.related_transaction_id).toBeNull();
    expect(doc.lot_id).toBeNull();
    expect(doc.amounts_status).toBe('COMPLETE');
  });

  it('stores quantity as a 10-decimal string', () => {
    expect(buildTransactionDoc(baseInput, ctx).quantity).toBe('10.0000000000');
  });

  it('builds a single-currency amounts map keyed by original_currency', () => {
    const doc = buildTransactionDoc(baseInput, ctx);
    expect(Object.keys(doc.amounts)).toEqual(['USD']);
    const amt = doc.amounts.USD!;
    expect(amt.is_original).toBe(true);
    expect(amt.rate).toBe('1.0000000000');
    expect(amt.rate_source).toBeNull();
    expect(amt.rate_type).toBeNull();
    expect(amt.rate_date).toBeNull();
  });

  it('converts price/fee/tax to 10-decimal strings via Money', () => {
    const amt = buildTransactionDoc(baseInput, ctx).amounts.USD!;
    expect(amt.price).toBe('180.5000000000');
    expect(amt.fee).toBe('1.2500000000');
    expect(amt.tax).toBe('0.5000000000');
  });

  it('computes total = price × quantity (Money, not native float)', () => {
    // 180.5 × 10 = 1805
    expect(buildTransactionDoc(baseInput, ctx).amounts.USD!.total).toBe('1805.0000000000');
  });

  it('matches the §4 worked example shape (500 × 1000 = 500000)', () => {
    const doc = buildTransactionDoc(
      {
        ...baseInput,
        original_currency: 'TWD',
        symbol: '2330',
        market: 'TW',
        price: '500',
        quantity: '1000',
      },
      ctx,
    );
    expect(Object.keys(doc.amounts)).toEqual(['TWD']);
    expect(doc.amounts.TWD!.total).toBe('500000.0000000000');
  });

  it('does not emit created_at / updated_at (write layer adds them)', () => {
    const doc = buildTransactionDoc(baseInput, ctx);
    expect('created_at' in doc).toBe(false);
    expect('updated_at' in doc).toBe(false);
  });

  it('is deterministic for the same input', () => {
    expect(buildTransactionDoc(baseInput, ctx)).toEqual(buildTransactionDoc(baseInput, ctx));
  });

  it('throws InvalidMoneyValueError on non-finite money (defensive, post-schema)', () => {
    expect(() => buildTransactionDoc({ ...baseInput, price: 'Infinity' }, ctx)).toThrow(
      InvalidMoneyValueError,
    );
  });
});
