export type AuthMode = 'monitor' | 'enforce';
export type IdTokenOutcome = 'verified' | 'missing' | 'invalid';

export interface IdTokenDeps {
  mode: AuthMode;
  /** Verifies a Firebase ID token (Admin SDK `getAuth().verifyIdToken`); throws when invalid. */
  verify: (token: string) => Promise<{ uid: string }>;
}

export interface IdTokenResult {
  outcome: IdTokenOutcome;
  allow: boolean;
  uid?: string;
  /** Verifier error code (e.g. `auth/id-token-expired`) when the outcome is invalid. */
  reason?: string;
}

/** Bare token from an `Authorization: Bearer <token>` header, or null when absent. */
export function bearerToken(header: string | undefined): string | null {
  const match = /^bearer\s+(\S+)\s*$/i.exec(header ?? '');
  return match?.[1] ?? null;
}

/**
 * Classifies the `Authorization` header of a request (require-auth-for-functions D3).
 * monitor: every outcome is allowed (we only log it). enforce: missing or invalid tokens
 * are rejected. Pure apart from the injected verifier, so both modes are unit-tested.
 * Unlike the App Check gate it does not skip the emulator: the Admin SDK accepts tokens
 * from the Auth emulator, so local runs exercise the real path (D4).
 */
export async function checkIdToken(
  header: string | undefined,
  deps: IdTokenDeps,
): Promise<IdTokenResult> {
  const enforce = deps.mode === 'enforce';
  const token = bearerToken(header);
  if (token === null) return { outcome: 'missing', allow: !enforce };
  try {
    const { uid } = await deps.verify(token);
    return { outcome: 'verified', allow: true, uid };
  } catch (e) {
    const code = (e as { code?: unknown }).code;
    return {
      outcome: 'invalid',
      allow: !enforce,
      reason: typeof code === 'string' ? code : 'unknown',
    };
  }
}
