import { onRequest, type HttpsOptions } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getAppCheck } from 'firebase-admin/app-check';
import { APP_CHECK_MODE, USER_HTTP_OPTIONS } from '../runtimeOptions';
import { checkAppCheck } from './appCheckGate';

/** Request handler signature of `onRequest` (avoids a direct express type dependency). */
type HttpHandler = Parameters<typeof onRequest>[0];

/** Marker label checked by runtimeOptions.test.ts: every user-facing HTTP function is gated. */
export const APP_CHECK_LABEL = { 'app-check': 'gated' } as const;

/**
 * Defines a user-facing HTTP function: shared runtime options (region, CORS, scaling)
 * plus the App Check gate in front of the handler. In enforce mode an unverified request
 * gets 401 before any Yahoo call or Firestore access.
 */
export function userHttpFunction(
  name: string,
  handler: HttpHandler,
  extra: Pick<HttpsOptions, 'timeoutSeconds'> = {},
) {
  return onRequest(
    { ...USER_HTTP_OPTIONS, ...extra, labels: { ...APP_CHECK_LABEL } },
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
      await handler(req, res);
    },
  );
}
