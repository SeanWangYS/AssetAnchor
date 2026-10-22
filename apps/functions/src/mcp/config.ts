import { REGION } from '../runtimeOptions';

/** Where each MCP-facing URL lives (design D3). All values carry no trailing slash. */
export interface McpConfig {
  isEmulator: boolean;
  /** OAuth issuer: the function's own origin (Cloud Run URL in production). */
  issuer: string;
  /** Path prefix the emulator strips before the request reaches Express ('' in production). */
  pathPrefix: string;
  /** Firebase Hosting origin serving the login page and the connector URL. */
  hostingOrigin: string;
  /** The MCP endpoint (connector URL); also the OAuth resource indicator for issued tokens. */
  resourceUrl: string;
  /** Login and consent page. */
  connectUrl: string;
}

export type McpEnv = Partial<
  Record<
    | 'FUNCTIONS_EMULATOR'
    | 'GCLOUD_PROJECT'
    | 'MCP_ISSUER_URL'
    | 'MCP_EMULATOR_FUNCTIONS_ORIGIN'
    | 'MCP_EMULATOR_HOSTING_ORIGIN',
    string
  >
>;

const trimSlash = (s: string) => s.replace(/\/+$/, '');

/** Resolves the MCP URLs from the runtime environment; throws on a misconfigured production. */
export function resolveMcpConfig(env: McpEnv): McpConfig {
  const project = env.GCLOUD_PROJECT;
  if (!project) throw new Error('GCLOUD_PROJECT is not set');

  if (env.FUNCTIONS_EMULATOR === 'true') {
    const fnOrigin = trimSlash(env.MCP_EMULATOR_FUNCTIONS_ORIGIN ?? 'http://127.0.0.1:5001');
    const hostingOrigin = trimSlash(env.MCP_EMULATOR_HOSTING_ORIGIN ?? 'http://127.0.0.1:5002');
    const pathPrefix = `/${project}/${REGION}/mcp`;
    return {
      isEmulator: true,
      issuer: `${fnOrigin}${pathPrefix}`,
      pathPrefix,
      hostingOrigin,
      resourceUrl: `${hostingOrigin}/mcp`,
      connectUrl: `${hostingOrigin}/connect`,
    };
  }

  const issuer = trimSlash(env.MCP_ISSUER_URL ?? '');
  if (!issuer.startsWith('https://')) {
    throw new Error('MCP_ISSUER_URL must be the https Cloud Run URL of the mcp function');
  }
  const hostingOrigin = `https://${project}.web.app`;
  return {
    isEmulator: false,
    issuer,
    pathPrefix: '',
    hostingOrigin,
    resourceUrl: `${hostingOrigin}/mcp`,
    connectUrl: `${hostingOrigin}/connect`,
  };
}

/** Parses the comma-separated cookie signing keys secret (newest key first). */
export function parseCookieKeys(raw: string | undefined): string[] {
  const keys = (raw ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  if (keys.length === 0) throw new Error('MCP_COOKIE_KEYS is empty');
  return keys;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Dynamic client registration policy: https redirect URIs, or plain http on loopback for local
 * clients (MCP Inspector, Claude Code). No credentials or fragments.
 */
export function isAllowedRedirectUri(uri: string): boolean {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  if (url.username || url.password || url.hash) return false;
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname);
}
