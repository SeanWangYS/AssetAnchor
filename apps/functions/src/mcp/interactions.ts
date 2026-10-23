import express, { type Request, type Response, type Router } from 'express';
import * as logger from 'firebase-functions/logger';
import type Provider from 'oidc-provider';
import type { Adapter } from 'oidc-provider';
import type { McpConfig } from './config';
import { ALL_SCOPES } from './scopes';

/** How long a verified Firebase login waits for the user to press 允許 (design D4). */
const LOGIN_TTL = 300;

export interface InteractionDeps {
  provider: Provider;
  config: McpConfig;
  adapter: new (model: string) => Adapter;
  /** Admin SDK ID-token verification; resolves to the Firebase uid or throws. */
  verifyIdToken: (idToken: string) => Promise<string>;
}

/** Plain-text 繁中 error page for the user's browser (no provider internals). */
function sendError(res: Response, status: number, message: string) {
  res.status(status).type('text/plain; charset=utf-8').send(message);
}

/**
 * Login and consent interaction (design D4):
 * 1. GET  /interaction/:uid          → redirect to the Hosting login page
 * 2. POST /interaction/:uid/firebase → verify the ID token, remember the uid (CORS: Hosting only)
 * 3. GET  /interaction/:uid/confirm  → top-level navigation with the interaction cookie; grant
 * 4. GET  /interaction/:uid/abort    → access_denied
 */
export function interactionRouter({
  provider,
  config,
  adapter,
  verifyIdToken,
}: InteractionDeps): Router {
  const router = express.Router();
  const FirebaseLogin = new adapter('FirebaseLogin');

  router.get('/interaction/:uid', async (req: Request, res: Response) => {
    try {
      const details = await provider.interactionDetails(req, res);
      const client = await provider.Client.find(String(details.params.client_id));
      const url = new URL(config.connectUrl);
      url.searchParams.set('interaction', details.uid);
      url.searchParams.set('client', client?.clientName ?? 'MCP client');
      res.redirect(303, url.href);
    } catch (err) {
      logger.warn('mcp interaction lookup failed', { error: String(err) });
      sendError(res, 400, '授權連線已逾時，請回到 Claude 重新連線 AssetAnchor。');
    }
  });

  const cors = (req: Request, res: Response) => {
    res.set('Access-Control-Allow-Origin', config.hostingOrigin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    return req.headers.origin === config.hostingOrigin;
  };

  router.options('/interaction/:uid/firebase', (req, res) => {
    cors(req, res);
    res.status(204).end();
  });

  router.post('/interaction/:uid/firebase', express.json(), async (req: Request, res: Response) => {
    if (!cors(req, res)) {
      res.status(403).json({ ok: false, error: '不允許的來源' });
      return;
    }
    const uid = String(req.params.uid);
    const idToken = (req.body as { idToken?: unknown } | undefined)?.idToken;
    if (typeof idToken !== 'string' || !idToken) {
      res.status(400).json({ ok: false, error: '缺少登入憑證' });
      return;
    }
    const interaction = await provider.Interaction.find(uid);
    if (!interaction) {
      res.status(410).json({ ok: false, error: '授權連線已逾時，請回到 Claude 重新連線' });
      return;
    }
    let accountId: string;
    try {
      accountId = await verifyIdToken(idToken);
    } catch {
      res.status(401).json({ ok: false, error: '登入憑證無效，請重新登入' });
      return;
    }
    await FirebaseLogin.upsert(uid, { uid, accountId }, LOGIN_TTL);
    res.json({ ok: true });
  });

  router.get('/interaction/:uid/confirm', async (req: Request, res: Response) => {
    try {
      const details = await provider.interactionDetails(req, res);
      const login = await FirebaseLogin.find(details.uid);
      const accountId = typeof login?.accountId === 'string' ? login.accountId : undefined;
      if (!accountId) {
        sendError(res, 400, '登入已逾時，請回到 Claude 重新連線 AssetAnchor。');
        return;
      }
      await FirebaseLogin.destroy(details.uid);

      const clientId = String(details.params.client_id);
      const grant = new provider.Grant({ accountId, clientId });
      grant.addResourceScope(config.resourceUrl, ALL_SCOPES.join(' '));
      const requested = String(details.params.scope ?? '').split(' ');
      if (requested.includes('offline_access')) grant.addOIDCScope('offline_access');
      const grantId = await grant.save();

      await provider.interactionFinished(
        req,
        res,
        { login: { accountId }, consent: { grantId } },
        { mergeWithLastSubmission: false },
      );
    } catch (err) {
      logger.warn('mcp interaction confirm failed', { error: String(err) });
      sendError(res, 400, '授權連線已逾時，請回到 Claude 重新連線 AssetAnchor。');
    }
  });

  router.get('/interaction/:uid/abort', async (req: Request, res: Response) => {
    try {
      await provider.interactionFinished(
        req,
        res,
        { error: 'access_denied', error_description: '使用者拒絕授權' },
        { mergeWithLastSubmission: false },
      );
    } catch {
      sendError(res, 400, '授權連線已逾時，請回到 Claude 重新連線 AssetAnchor。');
    }
  });

  return router;
}
