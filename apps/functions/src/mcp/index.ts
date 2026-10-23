import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import type { Express } from 'express';
import { MCP_HTTP_OPTIONS } from '../runtimeOptions';

const cookieKeysSecret = defineSecret('MCP_COOKIE_KEYS');
const jwksSecret = defineSecret('MCP_OIDC_JWKS');
/** The function's Cloud Run URL, known after the first deploy (runbook mcp-operations). */
const issuerParam = defineString('MCP_ISSUER_URL', { default: '' });

/** Development-only keys: the emulator never reads the production secrets (spec). */
const EMULATOR_COOKIE_KEYS = ['assetanchor-emulator-cookie-key'];

let appPromise: Promise<Express> | undefined;

/**
 * Builds the app on first request. oidc-provider is ESM-only and loaded lazily through the
 * bundle, which also keeps unit tests that import `index.ts` free of it.
 */
async function getApp(): Promise<Express> {
  appPromise ??= (async () => {
    const [
      { getFirestore },
      { getAuth },
      cfgMod,
      adapterMod,
      providerMod,
      appMod,
      confirmMod,
      yahooMod,
      fakeMod,
    ] = await Promise.all([
      import('firebase-admin/firestore'),
      import('firebase-admin/auth'),
      import('./config'),
      import('./firestoreAdapter'),
      import('./provider'),
      import('./app'),
      import('./import/confirmation'),
      import('../symbols/symbolMetaProvider'),
      import('./import/fakeSymbolProvider'),
    ]);
    const config = cfgMod.resolveMcpConfig({ ...process.env, MCP_ISSUER_URL: issuerParam.value() });
    const db = getFirestore();
    const adapter = adapterMod.createFirestoreAdapter(db);
    const cookieKeys = config.isEmulator
      ? EMULATOR_COOKIE_KEYS
      : cfgMod.parseCookieKeys(cookieKeysSecret.value());
    const jwks = config.isEmulator ? undefined : JSON.parse(jwksSecret.value());
    const provider = providerMod.createProvider({ config, adapter, cookieKeys, jwks });
    return appMod.buildMcpApp({
      config,
      provider,
      adapter,
      db,
      verifyIdToken: async (idToken) => (await getAuth().verifyIdToken(idToken, true)).uid,
      confirmationKey: confirmMod.deriveConfirmationKey(cookieKeys[0] ?? ''),
      symbolProvider:
        config.isEmulator && process.env.MCP_FAKE_SYMBOL_PROVIDER === 'true'
          ? fakeMod.fakeSymbolMetaProvider
          : yahooMod.yahooSymbolMetaProvider,
    });
  })();
  try {
    return await appPromise;
  } catch (err) {
    appPromise = undefined;
    throw err;
  }
}

/**
 * MCP endpoint + OAuth authorization server (add-mcp-auth-readonly, ADR-0011). Not behind
 * App Check: callers are Claude's servers, authenticated with OAuth bearer tokens instead.
 */
export const mcp = onRequest(
  { ...MCP_HTTP_OPTIONS, secrets: [cookieKeysSecret, jwksSecret] },
  async (req, res) => {
    let app: Express;
    try {
      app = await getApp();
    } catch (err) {
      logger.error('mcp app init failed', { error: String(err) });
      res.status(500).json({ error: 'server_error' });
      return;
    }
    // firebase-functions bundles its own express typings; the objects are the same at runtime.
    (app as unknown as (rq: typeof req, rs: typeof res) => void)(req, res);
  },
);
