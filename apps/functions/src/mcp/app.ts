import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import type Provider from 'oidc-provider';
import type { Adapter } from 'oidc-provider';
import {
  McpServer,
  OAuthError,
  OAuthErrorCode,
  createMcpHandler,
  type AuthInfo,
} from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { requireBearerAuth } from '@modelcontextprotocol/express';
import { isAllowedRedirectUri, type McpConfig } from './config';
import { interactionRouter } from './interactions';
import { createRateLimiter, registrationScope } from './oauthPolicy';
import { ALL_SCOPES, READ_SCOPE } from './scopes';
import { registerReadTools } from './tools/readTools';
import { registerImportTools } from './import/importTools';
import { registerEditTools } from './edit/editTools';
import type { SymbolMetaProvider } from '../symbols/symbolMetaProvider';

export const MCP_SERVER_VERSION = '1.0.0';

export interface McpAppDeps {
  config: McpConfig;
  provider: Provider;
  adapter: new (model: string) => Adapter;
  db: Firestore;
  verifyIdToken: (idToken: string) => Promise<string>;
  /** HMAC key binding validated import batches to their confirmation (import design D1). */
  confirmationKey: Buffer;
  /** Confirms new symbols exist (Yahoo in production, a fixed fake in integration tests). */
  symbolProvider: SymbolMetaProvider;
}

const PRM_PATH = '/.well-known/oauth-protected-resource';

/** Verifies an opaque access token against the provider's store (design D1). */
export function tokenVerifier(provider: Provider, config: McpConfig) {
  return {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      const at = await provider.AccessToken.find(token);
      if (!at || !at.accountId || !at.exp || at.aud !== config.resourceUrl) {
        throw new OAuthError(OAuthErrorCode.InvalidToken, 'Invalid or expired access token');
      }
      return {
        token,
        clientId: at.clientId ?? '',
        scopes: (at.scope ?? '').split(' ').filter(Boolean),
        expiresAt: at.exp,
        resource: new URL(config.resourceUrl),
        extra: { uid: at.accountId },
      };
    },
  };
}

/**
 * The `mcp` function's Express app (design D2): OAuth authorization server at the root,
 * login interaction routes, protected-resource metadata and the MCP endpoint.
 */
export function buildMcpApp({
  config,
  provider,
  adapter,
  db,
  verifyIdToken,
  confirmationKey,
  symbolProvider,
}: McpAppDeps): Express {
  const app = express();
  app.disable('x-powered-by');

  // The emulator strips `/{project}/asia-east1/mcp`; restore it so the provider builds
  // correct absolute URLs (design D3). Production serves at the Cloud Run root.
  if (config.pathPrefix) {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      if (!req.originalUrl.startsWith(config.pathPrefix)) {
        req.originalUrl = config.pathPrefix + req.originalUrl;
      }
      next();
    });
  }

  const metadataUrl = `${config.hostingOrigin}${PRM_PATH}/mcp`;
  const protectedResource = {
    resource: config.resourceUrl,
    authorization_servers: [config.issuer],
    scopes_supported: [...ALL_SCOPES],
    bearer_methods_supported: ['header'],
    resource_name: 'AssetAnchor',
  };
  app.get([PRM_PATH, `${PRM_PATH}/mcp`], (_req, res) => {
    res.set('Access-Control-Allow-Origin', '*').json(protectedResource);
  });

  // RFC 8414 location for the issuer; the provider itself serves the OIDC discovery path.
  const providerCallback = provider.callback();
  app.get('/.well-known/oauth-authorization-server', (req, res) => {
    req.url = '/.well-known/openid-configuration';
    // Keep originalUrl consistent so the provider derives the same mount path.
    req.originalUrl = `${config.pathPrefix}${req.url}`;
    void providerCallback(req, res);
  });

  app.use(interactionRouter({ provider, config, adapter, verifyIdToken }));

  // A client that omits `scope` would get a token with no resource scopes and hit 403 on every
  // tool; default it to everything the connector needs.
  app.get('/auth', (req: Request, _res: Response, next: NextFunction) => {
    if (req.query.scope === undefined) {
      const url = new URL(req.url, 'http://local');
      url.searchParams.set('scope', [...ALL_SCOPES, 'offline_access'].join(' '));
      req.url = `${url.pathname}${url.search}`;
      req.originalUrl = `${config.pathPrefix}${req.url}`;
    }
    next();
  });

  // Open registration is unauthenticated: throttle it and pin redirect URIs (spec DCR).
  const allowRegistration = createRateLimiter({
    limit: config.registrationLimit,
    windowMs: 60_000,
  });
  app.post('/reg', (req: Request, res: Response, next: NextFunction) => {
    if (!allowRegistration(req.ip ?? 'unknown', Date.now())) {
      res.status(429).json({ error: 'slow_down', error_description: 'Too many registrations' });
      return;
    }
    const uris = (req.body as { redirect_uris?: unknown } | undefined)?.redirect_uris;
    if (
      !Array.isArray(uris) ||
      uris.length === 0 ||
      !uris.every((u) => typeof u === 'string' && isAllowedRedirectUri(u))
    ) {
      res.status(400).json({
        error: 'invalid_redirect_uri',
        error_description: 'redirect_uris must be https, or http on a loopback address',
      });
      return;
    }
    const body = req.body as { scope?: unknown };
    const scope = registrationScope(body.scope);
    if (scope === undefined) delete body.scope;
    else body.scope = scope;
    next();
  });

  const mcpHandler = toNodeHandler(
    createMcpHandler(
      (ctx) => {
        const uid = ctx.authInfo?.extra?.uid;
        if (typeof uid !== 'string' || !uid) throw new Error('missing uid on verified token');
        const server = new McpServer({ name: 'assetanchor', version: MCP_SERVER_VERSION });
        registerReadTools(server, { db, uid });
        const writeCtx = {
          db,
          uid,
          scopes: ctx.authInfo?.scopes ?? [],
          confirmationKey,
          symbolProvider,
        };
        registerImportTools(server, writeCtx);
        registerEditTools(server, writeCtx);
        return server;
      },
      { responseMode: 'json' },
    ),
  );
  app.all(
    '/mcp',
    requireBearerAuth({
      verifier: tokenVerifier(provider, config),
      requiredScopes: [READ_SCOPE],
      resourceMetadataUrl: metadataUrl,
      expectedResource: new URL(config.resourceUrl),
    }),
    (req: Request, res: Response) => void mcpHandler(req, res, req.body),
  );

  app.use(providerCallback);
  return app;
}
