import { deriveConfirmationKey, signConfirmation, verifyConfirmation } from './confirmation';

const key = deriveConfirmationKey('cookie-key');
const rows = [{ symbol: '2330', quantity: '1000.0000000000', keep_duplicate: false }];
const base = { uid: 'U1', accountId: 'acc-a', rows, key };
const NOW = 1_800_000_000_000;

describe('confirmation token', () => {
  it('verifies the same uid, account and rows within 30 minutes', () => {
    const token = signConfirmation({ ...base, now: NOW });
    expect(verifyConfirmation(token, { ...base, now: NOW + 29 * 60_000 })).toBe('ok');
  });

  it('rejects any change to the rows', () => {
    const token = signConfirmation({ ...base, now: NOW });
    const changed = [{ ...rows[0], quantity: '100.0000000000' }];
    expect(verifyConfirmation(token, { ...base, rows: changed, now: NOW })).toBe('mismatch');
    expect(verifyConfirmation(token, { ...base, rows: [...rows, ...rows], now: NOW })).toBe(
      'mismatch',
    );
  });

  it('rejects another user or account', () => {
    const token = signConfirmation({ ...base, now: NOW });
    expect(verifyConfirmation(token, { ...base, uid: 'U2', now: NOW })).toBe('mismatch');
    expect(verifyConfirmation(token, { ...base, accountId: 'acc-b', now: NOW })).toBe('mismatch');
  });

  it('expires after 30 minutes', () => {
    const token = signConfirmation({ ...base, now: NOW });
    expect(verifyConfirmation(token, { ...base, now: NOW + 31 * 60_000 })).toBe('expired');
  });

  it('rejects malformed or forged tokens', () => {
    expect(verifyConfirmation('nope', { ...base, now: NOW })).toBe('malformed');
    const token = signConfirmation({ ...base, now: NOW });
    const [exp] = token.split('.');
    expect(verifyConfirmation(`${exp}.forged`, { ...base, now: NOW })).toBe('mismatch');
    const otherKey = deriveConfirmationKey('other');
    expect(verifyConfirmation(token, { ...base, key: otherKey, now: NOW })).toBe('mismatch');
  });

  it('ignores key order inside rows', () => {
    const token = signConfirmation({ ...base, now: NOW });
    const reordered = [{ keep_duplicate: false, quantity: '1000.0000000000', symbol: '2330' }];
    expect(verifyConfirmation(token, { ...base, rows: reordered, now: NOW })).toBe('ok');
  });
});
