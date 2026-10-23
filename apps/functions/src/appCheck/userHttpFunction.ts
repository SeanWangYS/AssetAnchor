import { onRequest, type HttpsOptions } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { APP_CHECK_MODE, AUTH_MODE, USER_HTTP_OPTIONS } from '../runtimeOptions';
import { checkIdToken } from '../auth/idTokenGate';
import { checkAppCheck } from './appCheckGate';

/** Request handler signature of `onRequest` (avoids a direct express type dependency). */
type HttpHandler = Parameters<typeof onRequest>[0];

/** Marker labels checked by runtimeOptions.test.ts: every user-facing HTTP function is gated. */
export const APP_CHECK_LABEL = { 'app-check': 'gated' } as const;
export const AUTH_LABEL = { auth: 'id-token' } as const;

/**
 * Defines a user-facing HTTP function: shared runtime options (region, CORS, scaling)
 * plus two gates in front of the handler: App Check (is this the real app?) and then the
 * Firebase ID token (which user?). A gate in enforce mode answers 401 before any Yahoo
 * call or Firestore access.
 */
export function userHttpFunction(
  name: string,
  handler: HttpHandler,
  extra: Pick<HttpsOptions, 'timeoutSeconds'> = {},
) {
  return onRequest(
    { ...USER_HTTP_OPTIONS, ...extra, labels: { ...APP_CHECK_LABEL, ...AUTH_LABEL } },
    async (req, res) => {
      const { outcome, allow } = await checkAppCheck(req.header('X-Firebase-AppCheck'), {
        mode: APP_CHECK_MODE,
        isEmulator: process.env.FUNCTIONS_EMULATOR === 'true',
        verify: (token) => getAppCheck().verifyToken(token),
      });
      logger.info('appCheck', { fn: name, outcome, mode: APP_CHECK_MODE });
      if (!allow) {
        res.status(401).json({ ok: false, error: 'unauthorized' });
        return;
      }
      const auth = await checkIdToken(req.header('Authorization'), {
        mode: AUTH_MODE,
        verify: (token) => getAuth().verifyIdToken(token),
      });
      logger.info('auth', {
        fn: name,
        outcome: auth.outcome,
        mode: AUTH_MODE,
        uid: auth.uid,
        reason: auth.reason,
      });
      if (!auth.allow) {
        res.status(401).json({ ok: false, error: 'unauthorized' });
        return;
      }
      await handler(req, res);
    },
  );
}
