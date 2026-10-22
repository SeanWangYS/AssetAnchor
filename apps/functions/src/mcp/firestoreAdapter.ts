import type { Firestore } from 'firebase-admin/firestore';
import type { Adapter, AdapterPayload } from 'oidc-provider';
import { docIdFor, fromStoreDoc, markConsumed, toStoreDoc, type StoreDoc } from './oauthStoreDoc';

export const OAUTH_STORE = 'oauth_store';

/** Firestore batches cap at 500 writes; stay well below. */
const BATCH_LIMIT = 400;

async function deleteWhere(db: Firestore, field: keyof StoreDoc, value: string): Promise<number> {
  const snap = await db.collection(OAUTH_STORE).where(field, '==', value).get();
  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const d of snap.docs.slice(i, i + BATCH_LIMIT)) batch.delete(d.ref);
    await batch.commit();
  }
  return snap.size;
}

/**
 * oidc-provider adapter backed by the backend-only `oauth_store` collection (design D5).
 * Expired docs read as missing even before Firestore TTL removes them.
 */
export function createFirestoreAdapter(
  db: Firestore,
  now: () => Date = () => new Date(),
): new (model: string) => Adapter {
  return class FirestoreAdapter implements Adapter {
    constructor(private readonly model: string) {}

    private ref(id: string) {
      return db.collection(OAUTH_STORE).doc(docIdFor(this.model, id));
    }

    async upsert(id: string, payload: AdapterPayload, expiresIn: number): Promise<void> {
      await this.ref(id).set(toStoreDoc(this.model, { ...payload }, expiresIn, now()));
    }

    async find(id: string): Promise<AdapterPayload | undefined> {
      const snap = await this.ref(id).get();
      return fromStoreDoc(snap.data() as StoreDoc | undefined, now()) as AdapterPayload | undefined;
    }

    async findByUid(uid: string): Promise<AdapterPayload | undefined> {
      const snap = await db
        .collection(OAUTH_STORE)
        .where('model', '==', this.model)
        .where('interaction_uid', '==', uid)
        .limit(1)
        .get();
      const doc = snap.docs[0]?.data() as StoreDoc | undefined;
      return fromStoreDoc(doc, now()) as AdapterPayload | undefined;
    }

    async findByUserCode(): Promise<AdapterPayload | undefined> {
      // Device flow is disabled; the provider never calls this.
      return undefined;
    }

    async consume(id: string): Promise<void> {
      const ref = this.ref(id);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const doc = snap.data() as StoreDoc | undefined;
        if (doc) tx.update(ref, markConsumed(doc.payload, now()));
      });
    }

    async destroy(id: string): Promise<void> {
      await this.ref(id).delete();
    }

    async revokeByGrantId(grantId: string): Promise<void> {
      await deleteWhere(db, 'grant_id', grantId);
    }
  };
}

/**
 * Admin revocation (runbook): deletes every grant, token and session of a user, so their
 * access and refresh tokens stop working immediately. Returns the number of deleted docs.
 */
export function revokeAllForAccount(db: Firestore, uid: string): Promise<number> {
  return deleteWhere(db, 'account_id', uid);
}
