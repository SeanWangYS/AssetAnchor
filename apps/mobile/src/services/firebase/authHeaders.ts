/**
 * Firebase Auth ID token header the functions gate reads (require-auth-for-functions D1).
 * No token (signed out or token failure) → no header; the server decides.
 */
export function authHeaders(idToken: string | null): Record<string, string> {
  return idToken ? { Authorization: `Bearer ${idToken}` } : {};
}
