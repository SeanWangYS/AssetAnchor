import Provider, { errors, type Adapter, type Configuration, type JWKS } from 'oidc-provider';
import type { McpConfig } from './config';
import {
  ACCESS_TOKEN_TTL,
  AUTHORIZATION_CODE_TTL,
  INTERACTION_TTL,
  REFRESH_ABSOLUTE_TTL,
  refreshTokenTtl,
} from './oauthPolicy';
import { ALL_SCOPES } from './scopes';

export interface ProviderDeps {
  config: McpConfig;
  adapter: new (model: string) => Adapter;
  cookieKeys: string[];
  /** Signing keys; only used for ID tokens, which this server never issues to MCP clients. */
  jwks?: JWKS;
}

/**
 * The OAuth authorization server (design D1). Issues opaque access tokens bound to the MCP
 * endpoint (RFC 8707), requires S256 PKCE, allows open dynamic client registration and rotates
 * refresh tokens within a 30-day absolute lifetime.
 */
export function createProvider({ config, adapter, cookieKeys, jwks }: ProviderDeps): Provider {
  const configuration: Configuration = {
    adapter,
    clients: [],
    ...(jwks ? { jwks } : {}),
    cookies: {
      keys: cookieKeys,
      long: { signed: true, secure: !config.isEmulator, sameSite: 'lax' },
      short: { signed: true, secure: !config.isEmulator, sameSite: 'lax' },
    },
    // Resource scopes live in getResourceServerInfo only; listing them here would make the
    // provider treat them as OIDC scopes and re-prompt for consent (spike finding).
    scopes: ['offline_access'],
    claims: { openid: ['sub'] },
    findAccount: (_ctx, sub) => ({ accountId: sub, claims: () => ({ sub }) }),
    pkce: { required: () => true },
    features: {
      devInteractions: { enabled: false },
      registration: { enabled: true, initialAccessToken: false },
      revocation: { enabled: true },
      resourceIndicators: {
        enabled: true,
        defaultResource: () => config.resourceUrl,
        useGrantedResource: () => true,
        getResourceServerInfo: (_ctx, resourceIndicator) => {
          if (resourceIndicator !== config.resourceUrl) throw new errors.InvalidTarget();
          return {
            scope: ALL_SCOPES.join(' '),
            audience: config.resourceUrl,
            accessTokenFormat: 'opaque',
            accessTokenTTL: ACCESS_TOKEN_TTL,
          };
        },
      },
    },
    interactions: {
      url: (_ctx, interaction) => `${config.issuer}/interaction/${interaction.uid}`,
    },
    rotateRefreshToken: true,
    // Claude and local MCP clients call the token endpoint from servers or Node, not browsers.
    clientBasedCORS: () => false,
    ttl: {
      AccessToken: ACCESS_TOKEN_TTL,
      AuthorizationCode: AUTHORIZATION_CODE_TTL,
      Interaction: INTERACTION_TTL,
      Session: INTERACTION_TTL,
      Grant: REFRESH_ABSOLUTE_TTL,
      RefreshToken: (_ctx, token) =>
        refreshTokenTtl(token.iiat ?? token.iat ?? 0, Math.floor(Date.now() / 1000)),
    },
  };

  const provider = new Provider(config.issuer, configuration);
  // Behind Cloud Run / the emulator proxy: trust X-Forwarded-* for the external URL.
  provider.proxy = true;
  return provider;
}
