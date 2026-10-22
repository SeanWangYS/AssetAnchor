import { createHmac, timingSafeEqual } from 'node:crypto';

/** How long a validated batch may wait for the user's confirmation (design D1). */
export const CONFIRMATION_TTL_MS = 30 * 60_000;

export type ConfirmationCheck = 'ok' | 'mismatch' | 'expired' | 'malformed';

interface Subject {
  uid: string;
  accountId: string;
  rows: readonly Record<string, unknown>[];
  key: Buffer;
  now: number;
}

/** Derives the confirmation HMAC key from the cookie signing key (no extra secret). */
export function deriveConfirmationKey(cookieKey: string): Buffer {
  return createHmac('sha256', cookieKey).update('assetanchor-mcp-confirmation-v1').digest();
}

/** JSON with sorted keys, so the same rows always hash the same. */
function canonical(rows: readonly Record<string, unknown>[]): string {
  return JSON.stringify(
    rows.map((r) =>
      Object.fromEntries(
        Object.keys(r)
          .sort()
          .map((k) => [k, r[k]]),
      ),
    ),
  );
}

function mac(s: Omit<Subject, 'now'>, exp: number): string {
  return createHmac('sha256', s.key)
    .update([s.uid, s.accountId, canonical(s.rows), String(exp)].join('\n'))
    .digest('base64url');
}

/** Token binding a user, account and exact normalized rows: `{exp}.{hmac}`. */
export function signConfirmation(s: Subject): string {
  const exp = s.now + CONFIRMATION_TTL_MS;
  return `${exp}.${mac(s, exp)}`;
}

export function verifyConfirmation(token: string, s: Subject): ConfirmationCheck {
  const [expRaw, sig, extra] = token.split('.');
  const exp = Number(expRaw);
  if (!expRaw || !sig || extra !== undefined || !Number.isSafeInteger(exp)) return 'malformed';
  const expected = Buffer.from(mac(s, exp));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return 'mismatch';
  return s.now > exp ? 'expired' : 'ok';
}
