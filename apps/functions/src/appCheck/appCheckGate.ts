export type AppCheckMode = 'monitor' | 'enforce';
export type AppCheckOutcome = 'verified' | 'missing' | 'invalid' | 'skipped';

export interface AppCheckDeps {
  mode: AppCheckMode;
  /** Functions emulator: App Check is not enforced locally, so skip verification. */
  isEmulator: boolean;
  /** Verifies a token (Admin SDK `getAppCheck().verifyToken`); throws when invalid. */
  verify: (token: string) => Promise<unknown>;
}

/**
 * Classifies the `X-Firebase-AppCheck` header of a request (add-app-check D3).
 * monitor: every outcome is allowed (we only log it). enforce: missing or invalid tokens
 * are rejected. Pure apart from the injected verifier, so both modes are unit-tested.
 */
export async function checkAppCheck(
  header: string | undefined,
  deps: AppCheckDeps,
): Promise<{ outcome: AppCheckOutcome; allow: boolean }> {
  if (deps.isEmulator) return { outcome: 'skipped', allow: true };
  const enforce = deps.mode === 'enforce';
  if (!header) return { outcome: 'missing', allow: !enforce };
  try {
    await deps.verify(header);
    return { outcome: 'verified', allow: true };
  } catch {
    return { outcome: 'invalid', allow: !enforce };
  }
}
