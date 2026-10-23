import { mergeEdit, signEditToken, toStoredRow, verifyEditToken, type StoredRow } from './editRows';
import { deriveConfirmationKey } from '../import/confirmation';
import type { TransactionDocument } from '@assetanchor/shared';

const stored: StoredRow = toStoredRow({
  transaction_id: 't1',
  account_id: 'acc-a',
  transaction_date: '2025-01-02',
  symbol: '2330',
  market: 'TW',
  asset_type: 'STOCK',
  transaction_type: 'BUY',
  currency: 'TWD',
  quantity: '1000.0000000000',
  price: '580.0000000000',
  total: '580000.0000000000',
  fee: '0.0000000000',
  tax: '0.0000000000',
  notes: '',
} as TransactionDocument);

const key = deriveConfirmationKey('k');
const NOW = 1_800_000_000_000;

describe('mergeEdit', () => {
  it('keeps stored values for fields not changed', () => {
    expect(mergeEdit(stored, { quantity: '100' })).toEqual({
      accountId: 'acc-a',
      row: {
        transaction_date: '2025-01-02',
        symbol: '2330',
        market: 'TW',
        transaction_type: 'BUY',
        quantity: '100',
        price: '580.0000000000',
        asset_type: 'STOCK',
        currency: 'TWD',
        fee: '0.0000000000',
        tax: '0.0000000000',
        notes: '',
      },
    });
  });

  it('moves to another account', () => {
    expect(mergeEdit(stored, { account_id: 'acc-b' }).accountId).toBe('acc-b');
  });
});

describe('edit token', () => {
  const subject = {
    uid: 'U1',
    scope: 'update:t1',
    stored: [stored],
    next: [{ quantity: '100.0000000000' }],
    key,
    now: NOW,
  };

  it('verifies the same edit', () => {
    expect(verifyEditToken(signEditToken(subject), subject)).toBe('ok');
  });

  it('reports a stored transaction changed after the preview as stale', () => {
    const token = signEditToken(subject);
    expect(
      verifyEditToken(token, { ...subject, stored: [{ ...stored, price: '590.0000000000' }] }),
    ).toBe('stale');
  });

  it('reports a different requested edit as mismatch', () => {
    const token = signEditToken(subject);
    expect(verifyEditToken(token, { ...subject, next: [{ quantity: '200.0000000000' }] })).toBe(
      'mismatch',
    );
    expect(verifyEditToken('garbage', subject)).toBe('mismatch');
  });

  it('binds the order-independent set of stored rows for deletes', () => {
    const other = { ...stored, transaction_id: 't2' };
    const del = { uid: 'U1', scope: 'delete', stored: [stored, other], next: [], key, now: NOW };
    expect(verifyEditToken(signEditToken(del), { ...del, stored: [other, stored] })).toBe('ok');
    expect(verifyEditToken(signEditToken(del), { ...del, stored: [stored] })).toBe('stale');
  });

  it('expires after 30 minutes', () => {
    expect(verifyEditToken(signEditToken(subject), { ...subject, now: NOW + 31 * 60_000 })).toBe(
      'expired',
    );
  });
});
