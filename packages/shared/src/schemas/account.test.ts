import { accountInputSchema, type AccountInput } from './account.js';

const valid = {
  account_name: 'My Firstrade',
  broker: 'FIRSTRADE',
  account_type: 'BROKERAGE',
  base_currency: 'USD',
  market: 'US',
  color: '#1E88E5',
  notes: 'long term',
};

describe('accountInputSchema', () => {
  it('accepts a fully valid account input', () => {
    expect(accountInputSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty account_name', () => {
    expect(accountInputSchema.safeParse({ ...valid, account_name: '' }).success).toBe(false);
  });

  it('rejects whitespace-only account_name', () => {
    expect(accountInputSchema.safeParse({ ...valid, account_name: '   ' }).success).toBe(false);
  });

  it('trims surrounding whitespace from account_name', () => {
    const r = accountInputSchema.safeParse({ ...valid, account_name: '  Main  ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.account_name).toBe('Main');
  });

  it('rejects an unknown broker', () => {
    expect(accountInputSchema.safeParse({ ...valid, broker: 'NOT_A_BROKER' }).success).toBe(false);
  });

  it('rejects an unknown account_type', () => {
    expect(accountInputSchema.safeParse({ ...valid, account_type: 'NOPE' }).success).toBe(false);
  });

  it('accepts both MVP currencies USD and TWD', () => {
    expect(accountInputSchema.safeParse({ ...valid, base_currency: 'USD' }).success).toBe(true);
    expect(accountInputSchema.safeParse({ ...valid, base_currency: 'TWD' }).success).toBe(true);
  });

  it('rejects a non-MVP currency even if it is a valid Currency enum (JPY)', () => {
    expect(accountInputSchema.safeParse({ ...valid, base_currency: 'JPY' }).success).toBe(false);
  });

  it('rejects an unknown market', () => {
    expect(accountInputSchema.safeParse({ ...valid, market: 'MARS' }).success).toBe(false);
  });

  it('rejects malformed colors (not #RRGGBB)', () => {
    for (const bad of ['1E88E5', '#1E88E', '#GGGGGG', 'red', '#1e88e5ff']) {
      expect(accountInputSchema.safeParse({ ...valid, color: bad }).success).toBe(false);
    }
  });

  it('accepts a valid #RRGGBB color (case-insensitive)', () => {
    expect(accountInputSchema.safeParse({ ...valid, color: '#aabbcc' }).success).toBe(true);
    expect(accountInputSchema.safeParse({ ...valid, color: '#AABBCC' }).success).toBe(true);
  });

  it('defaults notes to empty string when omitted', () => {
    const withoutNotes = {
      account_name: 'My Firstrade',
      broker: 'FIRSTRADE',
      account_type: 'BROKERAGE',
      base_currency: 'USD',
      market: 'US',
      color: '#1E88E5',
    };
    const r = accountInputSchema.safeParse(withoutNotes);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.notes).toBe('');
  });

  it('infers AccountInput matching the schema output', () => {
    const typed: AccountInput = accountInputSchema.parse(valid);
    expect(typed.broker).toBe('FIRSTRADE');
  });
});
