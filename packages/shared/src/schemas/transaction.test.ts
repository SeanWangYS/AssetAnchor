import { transactionInputSchema, type TransactionInput } from './transaction.js';

const valid = {
  account_id: 'acc_123',
  symbol: '2330',
  market: 'TW',
  asset_type: 'STOCK',
  transaction_type: 'BUY',
  transaction_date: '2024-01-15',
  original_currency: 'TWD',
  quantity: '1000',
  price: '500',
  fee: '700',
  tax: '0',
  notes: '長期持有',
};

describe('transactionInputSchema', () => {
  it('accepts a fully valid BUY input', () => {
    expect(transactionInputSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing symbol', () => {
    expect(transactionInputSchema.safeParse({ ...valid, symbol: undefined }).success).toBe(false);
  });

  it('rejects whitespace-only symbol', () => {
    expect(transactionInputSchema.safeParse({ ...valid, symbol: '   ' }).success).toBe(false);
  });

  it('trims and upper-cases symbol', () => {
    const r = transactionInputSchema.safeParse({ ...valid, symbol: '  aapl  ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.symbol).toBe('AAPL');
  });

  it('rejects missing account_id', () => {
    expect(transactionInputSchema.safeParse({ ...valid, account_id: undefined }).success).toBe(
      false,
    );
  });

  it('rejects an unknown market', () => {
    expect(transactionInputSchema.safeParse({ ...valid, market: 'MARS' }).success).toBe(false);
  });

  it('rejects an unknown asset_type', () => {
    expect(transactionInputSchema.safeParse({ ...valid, asset_type: 'NFT' }).success).toBe(false);
  });

  it('rejects a non-BUY transaction_type (MVP scope is BUY only)', () => {
    expect(transactionInputSchema.safeParse({ ...valid, transaction_type: 'SELL' }).success).toBe(
      false,
    );
  });

  it('accepts both MVP currencies USD and TWD', () => {
    expect(transactionInputSchema.safeParse({ ...valid, original_currency: 'USD' }).success).toBe(
      true,
    );
    expect(transactionInputSchema.safeParse({ ...valid, original_currency: 'TWD' }).success).toBe(
      true,
    );
  });

  it('rejects a non-MVP currency even if it is a valid Currency enum (JPY)', () => {
    expect(transactionInputSchema.safeParse({ ...valid, original_currency: 'JPY' }).success).toBe(
      false,
    );
  });

  it('rejects malformed transaction_date (not YYYY-MM-DD)', () => {
    for (const bad of ['2024/01/15', '24-01-15', '2024-1-5', '2024-13-01', '2024-01-32', 'today']) {
      expect(transactionInputSchema.safeParse({ ...valid, transaction_date: bad }).success).toBe(
        false,
      );
    }
  });

  it('rejects non-positive or non-numeric quantity', () => {
    for (const bad of ['0', '-5', 'abc', '', 'NaN', 'Infinity']) {
      expect(transactionInputSchema.safeParse({ ...valid, quantity: bad }).success).toBe(false);
    }
  });

  it('accepts fractional quantity (零股 / 碎股)', () => {
    expect(transactionInputSchema.safeParse({ ...valid, quantity: '0.5' }).success).toBe(true);
  });

  it('rejects non-positive or non-numeric price', () => {
    for (const bad of ['0', '-1', 'abc', '', 'Infinity']) {
      expect(transactionInputSchema.safeParse({ ...valid, price: bad }).success).toBe(false);
    }
  });

  it('rejects negative fee or tax', () => {
    expect(transactionInputSchema.safeParse({ ...valid, fee: '-1' }).success).toBe(false);
    expect(transactionInputSchema.safeParse({ ...valid, tax: '-0.01' }).success).toBe(false);
  });

  it('accepts zero fee and tax (zero-commission brokers)', () => {
    const r = transactionInputSchema.safeParse({ ...valid, fee: '0', tax: '0' });
    expect(r.success).toBe(true);
  });

  it('defaults fee, tax and notes when omitted', () => {
    const r = transactionInputSchema.safeParse({
      ...valid,
      fee: undefined,
      tax: undefined,
      notes: undefined,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.fee).toBe('0');
      expect(r.data.tax).toBe('0');
      expect(r.data.notes).toBe('');
    }
  });

  it('infers TransactionInput matching the schema output', () => {
    const typed: TransactionInput = transactionInputSchema.parse(valid);
    expect(typed.transaction_type).toBe('BUY');
  });
});
