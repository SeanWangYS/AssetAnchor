/**
 * Pure mapping between oidc-provider adapter payloads and `oauth_store` documents (design D5).
 * One collection holds every model; the doc id is `{model}_{id}`.
 */

export type Payload = Record<string, unknown>;

type DateLike = Date | { toDate(): Date };

export interface StoreDoc {
  model: string;
  payload: Payload;
  /** Firebase uid the artefact belongs to — lets an admin revoke a user's tokens. */
  account_id: string | null;
  grant_id: string | null;
  interaction_uid: string | null;
  consumed_at: DateLike | null;
  /** TTL field; null means the doc never expires (registered clients). */
  expires_at: DateLike | null;
}

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function docIdFor(model: string, id: string): string {
  if (!ID_PATTERN.test(id)) throw new Error(`invalid ${model} id`);
  return `${model}_${id}`;
}

const asString = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const toDate = (v: DateLike): Date => (v instanceof Date ? v : v.toDate());

export function toStoreDoc(
  model: string,
  payload: Payload,
  expiresInSeconds: number | undefined,
  now: Date,
): StoreDoc {
  // JSON round trip drops undefined values, which Firestore rejects.
  const clean = JSON.parse(JSON.stringify(payload)) as Payload;
  return {
    model,
    payload: clean,
    account_id: asString(clean.accountId),
    grant_id: asString(clean.grantId),
    interaction_uid: asString(clean.uid),
    consumed_at: null,
    expires_at:
      expiresInSeconds === undefined ? null : new Date(now.getTime() + expiresInSeconds * 1000),
  };
}

/** Returns the payload, or undefined when the doc is missing or past its expiry. */
export function fromStoreDoc(doc: StoreDoc | undefined, now: Date): Payload | undefined {
  if (!doc) return undefined;
  if (doc.expires_at && toDate(doc.expires_at).getTime() <= now.getTime()) return undefined;
  return doc.payload;
}

/** Fields to merge when the provider consumes a code or refresh token. */
export function markConsumed(
  payload: Payload,
  now: Date,
): Pick<StoreDoc, 'payload' | 'consumed_at'> {
  return {
    payload: { ...payload, consumed: Math.floor(now.getTime() / 1000) },
    consumed_at: now,
  };
}
