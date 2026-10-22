import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createFirestoreAdapter, revokeAllForAccount, OAUTH_STORE } from './firestoreAdapter';

if (getApps().length === 0) initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-mcp' });
const db = getFirestore();

let clock = new Date('2026-10-23T00:00:00Z');
const Adapter = createFirestoreAdapter(db, () => clock);

async function clear() {
  const snap = await db.collection(OAUTH_STORE).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}

beforeEach(async () => {
  clock = new Date('2026-10-23T00:00:00Z');
  await clear();
});

describe('FirestoreAdapter', () => {
  it('stores, finds and destroys a payload', async () => {
    const at = new Adapter('AccessToken');
    await at.upsert('t1', { jti: 't1', accountId: 'U1', grantId: 'g1' }, 3600);
    expect(await at.find('t1')).toEqual({ jti: 't1', accountId: 'U1', grantId: 'g1' });
    await at.destroy('t1');
    expect(await at.find('t1')).toBeUndefined();
  });

  it('reads an expired doc as missing', async () => {
    const code = new Adapter('AuthorizationCode');
    await code.upsert('c1', { jti: 'c1' }, 600);
    clock = new Date('2026-10-23T00:11:00Z');
    expect(await code.find('c1')).toBeUndefined();
  });

  it('marks a consumed code so the provider rejects reuse', async () => {
    const code = new Adapter('AuthorizationCode');
    await code.upsert('c1', { jti: 'c1' }, 600);
    await code.consume('c1');
    expect(await code.find('c1')).toEqual({ jti: 'c1', consumed: expect.any(Number) });
  });

  it('finds interactions by uid within the same model only', async () => {
    await new Adapter('Interaction').upsert('i1', { uid: 'u-1' }, 600);
    await new Adapter('Session').upsert('s1', { uid: 'u-1' }, 600);
    expect(await new Adapter('Interaction').findByUid('u-1')).toEqual({ uid: 'u-1' });
    expect(await new Adapter('Grant').findByUid('u-1')).toBeUndefined();
  });

  it('revokes every artefact of a grant', async () => {
    const at = new Adapter('AccessToken');
    const rt = new Adapter('RefreshToken');
    await at.upsert('t1', { grantId: 'g1' }, 3600);
    await rt.upsert('r1', { grantId: 'g1' }, 3600);
    await at.upsert('t2', { grantId: 'g2' }, 3600);
    await at.revokeByGrantId('g1');
    expect(await at.find('t1')).toBeUndefined();
    expect(await rt.find('r1')).toBeUndefined();
    expect(await at.find('t2')).toBeDefined();
  });

  it('lets an admin revoke everything a user owns', async () => {
    await new Adapter('AccessToken').upsert('t1', { accountId: 'U1' }, 3600);
    await new Adapter('Grant').upsert('g1', { accountId: 'U1' }, 3600);
    await new Adapter('AccessToken').upsert('t2', { accountId: 'U2' }, 3600);
    expect(await revokeAllForAccount(db, 'U1')).toBe(2);
    expect(await new Adapter('AccessToken').find('t2')).toBeDefined();
  });
});
