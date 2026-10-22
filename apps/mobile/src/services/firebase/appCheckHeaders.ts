/** Header the Cloud Functions App Check gate reads (add-app-check D2/D3). */
export const APP_CHECK_HEADER = 'X-Firebase-AppCheck';

/** No token (emulator mode or token failure) → no header; the server decides. */
export function appCheckHeaders(token: string | null): Record<string, string> {
  return token ? { [APP_CHECK_HEADER]: token } : {};
}
