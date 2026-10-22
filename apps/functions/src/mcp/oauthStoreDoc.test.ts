import { docIdFor, toStoreDoc, fromStoreDoc, markConsumed } from './oauthStoreDoc';

const NOW = new Date('2026-10-23T00:00:00Z');

describe('docIdFor', () => {
  it('prefixes the id with the model name', () => {
    expect(docIdFor('AccessToken', 'abc_DEF-1')).toBe('AccessToken_abc_DEF-1');
  });

  it('rejects ids that would escape the collection', () => {
    expect(() => docIdFor('Client', 'a/b')).toThrow();
    expect(() => docIdFor('Client', '')).toThrow();
  });
});

describe('toStoreDoc', () => {
  it('mirrors the lookup keys and computes the expiry', () => {
    const doc = toStoreDoc(
      'AccessToken',
      { jti: 't1', accountId: 'U1', grantId: 'g1', clientId: 'c1', exp: 1 },
      3600,
      NOW,
    );
    expect(doc).toEqual({
      model: 'AccessToken',
      payload: { jti: 't1', accountId: 'U1', grantId: 'g1', clientId: 'c1', exp: 1 },
      account_id: 'U1',
      grant_id: 'g1',
      interaction_uid: null,
      consumed_at: null,
      expires_at: new Date('2026-10-23T01:00:00Z'),
    });
  });

  it('keeps the interaction uid for findByUid and drops undefined values', () => {
    const doc = toStoreDoc('Interaction', { uid: 'i1', returnTo: undefined }, 600, NOW);
    expect(doc.interaction_uid).toBe('i1');
    expect(doc.payload).toEqual({ uid: 'i1' });
    expect(doc.account_id).toBeNull();
  });

  it('never expires a registered client', () => {
    expect(toStoreDoc('Client', { client_id: 'c1' }, undefined, NOW).expires_at).toBeNull();
  });
});

describe('fromStoreDoc', () => {
  const base = toStoreDoc('AuthorizationCode', { jti: 'c1' }, 600, NOW);

  it('returns the payload while valid', () => {
    expect(fromStoreDoc(base, NOW)).toEqual({ jti: 'c1' });
  });

  it('treats an expired doc as missing even before TTL deletion', () => {
    expect(fromStoreDoc(base, new Date('2026-10-23T00:10:00Z'))).toBeUndefined();
  });

  it('accepts Firestore Timestamp-like expiry values', () => {
    const stored = { ...base, expires_at: { toDate: () => new Date('2026-10-23T00:10:00Z') } };
    expect(fromStoreDoc(stored, NOW)).toEqual({ jti: 'c1' });
  });

  it('exposes consumption to the provider', () => {
    const consumed = { ...base, ...markConsumed(base.payload, NOW) };
    expect(fromStoreDoc(consumed, NOW)).toEqual({ jti: 'c1', consumed: 1792713600 });
  });

  it('returns undefined for a missing doc', () => {
    expect(fromStoreDoc(undefined, NOW)).toBeUndefined();
  });
});
