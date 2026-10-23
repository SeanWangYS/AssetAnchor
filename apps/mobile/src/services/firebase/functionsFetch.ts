import { getApp } from '@react-native-firebase/app';
import { getAuth, getIdToken } from '@react-native-firebase/auth';
import { reportHandledError } from '../monitoring';
import { appCheckToken } from './appCheck';
import { appCheckHeaders } from './appCheckHeaders';
import { authHeaders } from './authHeaders';

let idTokenErrorReported = false;

/** Signed-in user's Firebase ID token, or null when signed out or the token is unavailable. */
async function idToken(): Promise<string | null> {
  const user = getAuth(getApp()).currentUser;
  if (!user) return null;
  try {
    // Cached by the SDK and refreshed shortly before expiry, so this is usually local.
    return await getIdToken(user);
  } catch (e) {
    // Report once per session: an auth outage would otherwise fire on every request.
    if (!idTokenErrorReported) {
      idTokenErrorReported = true;
      reportHandledError('auth:idtoken', { error: String(e) });
    }
    return null;
  }
}

/**
 * `fetch` for Cloud Functions: attaches the App Check token (add-app-check D2) and the
 * signed-in user's ID token (require-auth-for-functions D6) when available.
 */
export async function functionsFetch(url: string): Promise<Response> {
  const [appCheck, id] = await Promise.all([appCheckToken(), idToken()]);
  return fetch(url, { headers: { ...appCheckHeaders(appCheck), ...authHeaders(id) } });
}
