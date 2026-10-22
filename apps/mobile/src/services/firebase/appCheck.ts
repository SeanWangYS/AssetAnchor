import { getApp } from '@react-native-firebase/app';
import { getToken, initializeAppCheck, type AppCheck } from '@react-native-firebase/app-check';
import { reportHandledError } from '../monitoring';
import { appCheckHeaders } from './appCheckHeaders';

const USE_EMULATOR = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

let ready: Promise<AppCheck | null> | null = null;
let tokenErrorReported = false;

/**
 * Starts App Check once at app start (add-app-check D1): App Attest provider with token
 * auto-refresh. Skipped against local emulators, which do not enforce App Check. Init
 * failures are reported and resolve to null so the app keeps working in monitor mode.
 */
export function initAppCheck(): Promise<AppCheck | null> {
  if (ready) return ready;
  if (USE_EMULATOR) {
    ready = Promise.resolve(null);
    return ready;
  }
  // Inline providerOptions form (RNFB docs); the package root only re-exports the
  // provider class as a type.
  ready = initializeAppCheck(getApp(), {
    provider: { providerOptions: { apple: { provider: 'appAttest' } } },
    isTokenAutoRefreshEnabled: true,
  }).catch((e: unknown) => {
    reportHandledError('appcheck:init', { error: String(e) });
    return null;
  });
  return ready;
}

/** Current App Check token, or null when App Check is off or the token is unavailable. */
async function appCheckToken(): Promise<string | null> {
  const appCheck = await initAppCheck();
  if (!appCheck) return null;
  try {
    return (await getToken(appCheck, false)).token;
  } catch (e) {
    // Report once per session: a broken attestation would otherwise fire on every request.
    if (!tokenErrorReported) {
      tokenErrorReported = true;
      reportHandledError('appcheck:token', { error: String(e) });
    }
    return null;
  }
}

/** `fetch` for Cloud Functions with the App Check header attached when available (D2). */
export async function functionsFetch(url: string): Promise<Response> {
  return fetch(url, { headers: appCheckHeaders(await appCheckToken()) });
}
