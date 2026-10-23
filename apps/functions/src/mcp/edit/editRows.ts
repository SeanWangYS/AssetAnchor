import { createHash } from 'node:crypto';
import type { TransactionDocument } from '@assetanchor/shared';
import type { ImportRowInput } from '../import/importRows';
import { signConfirmation, verifyConfirmation } from '../import/confirmation';

/** The user-facing fields of a stored transaction (no timestamps), as shown and bound. */
export type StoredRow = Pick<
  TransactionDocument,
  | 'transaction_id'
  | 'account_id'
  | 'transaction_date'
  | 'symbol'
  | 'market'
  | 'asset_type'
  | 'transaction_type'
  | 'currency'
  | 'quantity'
  | 'price'
  | 'fee'
  | 'tax'
  | 'notes'
>;

export function toStoredRow(t: TransactionDocument): StoredRow {
  return {
    transaction_id: t.transaction_id,
    account_id: t.account_id,
    transaction_date: t.transaction_date,
    symbol: t.symbol,
    market: t.market,
    asset_type: t.asset_type,
    transaction_type: t.transaction_type,
    currency: t.currency,
    quantity: t.quantity,
    price: t.price,
    fee: t.fee,
    tax: t.tax,
    notes: t.notes,
  };
}

/** Fields an edit may change; anything omitted keeps the stored value. */
export type EditChanges = Partial<
  Record<Exclude<keyof ImportRowInput, 'keep_duplicate'> | 'account_id', string | undefined>
>;

/** Applies changes over the stored transaction, ready for the import row normalizer. */
export function mergeEdit(
  stored: StoredRow,
  changes: EditChanges,
): { accountId: string; row: ImportRowInput } {
  const pick = <K extends keyof EditChanges>(k: K, fallback: string) => {
    const v = changes[k];
    return typeof v === 'string' ? v : fallback;
  };
  return {
    accountId: pick('account_id', stored.account_id),
    row: {
      transaction_date: pick('transaction_date', stored.transaction_date),
      symbol: pick('symbol', stored.symbol),
      market: pick('market', stored.market),
      transaction_type: pick('transaction_type', stored.transaction_type),
      quantity: pick('quantity', stored.quantity),
      price: pick('price', stored.price),
      asset_type: pick('asset_type', stored.asset_type),
      currency: pick('currency', stored.currency),
      fee: pick('fee', stored.fee),
      tax: pick('tax', stored.tax),
      notes: pick('notes', stored.notes),
    },
  };
}

/** Short digest of stored rows, so a stale confirmation can be told apart from a changed request. */
export function digestRows(rows: readonly StoredRow[]): string {
  const sorted = [...rows].sort((a, b) => a.transaction_id.localeCompare(b.transaction_id));
  return createHash('sha256').update(JSON.stringify(sorted)).digest('base64url').slice(0, 16);
}

interface TokenSubject {
  uid: string;
  /** `update:{id}` or `delete`. */
  scope: string;
  stored: readonly StoredRow[];
  /** What will be written (the edited row); empty for deletes. */
  next: readonly Record<string, unknown>[];
  key: Buffer;
  now: number;
}

const bound = (s: TokenSubject) => ({
  uid: s.uid,
  accountId: s.scope,
  rows: [
    ...[...s.stored].sort((a, b) => a.transaction_id.localeCompare(b.transaction_id)),
    ...s.next,
  ],
  key: s.key,
  now: s.now,
});

/** `{digest of stored rows}~{confirmation}`. */
export function signEditToken(s: TokenSubject): string {
  return `${digestRows(s.stored)}~${signConfirmation(bound(s))}`;
}

export type EditTokenCheck = 'ok' | 'stale' | 'mismatch' | 'expired';

/** `stale` when the stored transactions changed since the preview. */
export function verifyEditToken(token: string, s: TokenSubject): EditTokenCheck {
  const [digest, confirmation] = token.split('~');
  if (!digest || !confirmation) return 'mismatch';
  if (digest !== digestRows(s.stored)) return 'stale';
  const result = verifyConfirmation(confirmation, bound(s));
  return result === 'malformed' ? 'mismatch' : result;
}
