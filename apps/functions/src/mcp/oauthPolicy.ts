/** Token lifetimes (spec mcp-authorization, decision B2). Seconds. */
export const ACCESS_TOKEN_TTL = 3600;
export const AUTHORIZATION_CODE_TTL = 600;
export const INTERACTION_TTL = 600;
export const REFRESH_ABSOLUTE_TTL = 30 * 24 * 3600;

/**
 * Refresh tokens rotate on every use but never outlive 30 days from the first authorization:
 * `iiat` (initial issued-at) survives rotation, so the remaining lifetime shrinks each time.
 */
export function refreshTokenTtl(iiat: number, nowEpoch: number): number {
  return Math.max(1, REFRESH_ABSOLUTE_TTL - (nowEpoch - iiat));
}

/** Scopes oidc-provider itself knows; resource scopes stay out (see provider.ts). */
export const PROVIDER_SCOPES = ['offline_access'] as const;

/**
 * Clients such as Claude copy `scopes_supported` from the protected-resource metadata into
 * their registration `scope`. oidc-provider rejects scopes it does not know, so keep only
 * provider scopes; resource scopes are still granted per authorization request.
 */
export function registrationScope(scope: unknown): string | undefined {
  if (typeof scope !== 'string') return undefined;
  const known: readonly string[] = PROVIDER_SCOPES;
  const kept = scope.split(/\s+/).filter((s) => known.includes(s));
  return kept.length > 0 ? kept.join(' ') : undefined;
}

interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  /** Oldest keys are dropped beyond this many, bounding memory per instance. */
  maxKeys?: number;
}

/**
 * Fixed-window, per-instance limiter for the unauthenticated registration endpoint. Each
 * function instance counts on its own; with maxInstances 3 the global cap is at most 3×.
 */
export function createRateLimiter({ limit, windowMs, maxKeys = 1000 }: RateLimiterOptions) {
  const windows = new Map<string, { start: number; count: number }>();
  return (key: string, now: number): boolean => {
    const w = windows.get(key);
    if (!w || now - w.start >= windowMs) {
      windows.delete(key);
      windows.set(key, { start: now, count: 1 });
      if (windows.size > maxKeys) {
        const oldest = windows.keys().next().value;
        if (oldest !== undefined) windows.delete(oldest);
      }
      return true;
    }
    w.count += 1;
    return w.count <= limit;
  };
}
