import { createHash, randomBytes } from 'node:crypto';
import { ALL_SCOPES } from '../scopes';

/**
 * Minimal OAuth + MCP client for integration tests against the emulators
 * (firebase.integration.json). Mirrors what Claude's connector does.
 */

export const PROJECT = process.env.GCLOUD_PROJECT ?? 'demo-assetanchor';
export const FN = `http://127.0.0.1:5101/${PROJECT}/asia-east1/mcp`;
export const HOSTING = 'http://127.0.0.1:5102';
export const RESOURCE = `${HOSTING}/mcp`;
export const AUTH_EMULATOR = 'http://127.0.0.1:9199';
export const REDIRECT_URI = 'https://claude.ai/api/mcp/auth_callback';

/** Tiny cookie jar: name → value, enough for oidc-provider's interaction cookies. */
class Jar {
  private cookies = new Map<string, string>();
  store(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';');
      const eq = pair?.indexOf('=') ?? -1;
      if (pair && eq > 0) this.cookies.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  }
  header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

export async function signUp(email: string): Promise<{ uid: string; idToken: string }> {
  const res = await fetch(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'test1234', returnSecureToken: true }),
    },
  );
  const body = (await res.json()) as { localId: string; idToken: string };
  return { uid: body.localId, idToken: body.idToken };
}

/**
 * Registers like Claude does: the client copies `scopes_supported` from the protected-resource
 * metadata into its registration `scope`.
 */
export async function register(
  redirectUris: string[] = [REDIRECT_URI],
  scope: string | undefined = ALL_SCOPES.join(' '),
) {
  const res = await fetch(`${FN}/reg`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redirect_uris: redirectUris,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      client_name: 'Claude',
      ...(scope === undefined ? {} : { scope }),
    }),
  });
  return { status: res.status, body: (await res.json()) as Record<string, string> };
}

export function pkce() {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

interface AuthorizeOptions {
  clientId: string;
  idToken: string;
  challenge?: string | undefined;
  deny?: boolean;
  /** Requested scope; null omits the parameter. */
  scope?: string | null;
}

/** Runs /auth → login → consent and returns the final redirect URL back to the client. */
export async function authorize({
  clientId,
  idToken,
  challenge,
  deny,
  scope = 'transactions.read transactions.write offline_access',
}: AuthorizeOptions) {
  const jar = new Jar();
  const url = new URL(`${FN}/auth`);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  if (scope !== null) url.searchParams.set('scope', scope);
  url.searchParams.set('resource', RESOURCE);
  url.searchParams.set('state', 'st');
  url.searchParams.set('prompt', 'consent');
  if (challenge) {
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
  }
  const auth = await fetch(url, { redirect: 'manual' });
  jar.store(auth);
  const interactionUrl = auth.headers.get('location') ?? '';
  if (!interactionUrl.startsWith(`${FN}/interaction/`)) return new URL(interactionUrl);

  const toLogin = await fetch(interactionUrl, {
    redirect: 'manual',
    headers: { cookie: jar.header() },
  });
  const loginPage = new URL(toLogin.headers.get('location') ?? '');
  const uid = loginPage.searchParams.get('interaction') ?? '';

  const login = await fetch(`${FN}/interaction/${uid}/firebase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: HOSTING },
    body: JSON.stringify({ idToken }),
  });
  if (!login.ok) throw new Error(`login failed ${login.status}`);

  const step = deny ? 'abort' : 'confirm';
  const confirm = await fetch(`${FN}/interaction/${uid}/${step}`, {
    redirect: 'manual',
    headers: { cookie: jar.header() },
  });
  jar.store(confirm);
  const resume = await fetch(confirm.headers.get('location') ?? '', {
    redirect: 'manual',
    headers: { cookie: jar.header() },
  });
  return new URL(resume.headers.get('location') ?? '');
}

export async function token(params: Record<string, string>) {
  const res = await fetch(`${FN}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  return { status: res.status, body: (await res.json()) as Record<string, string> };
}

/** Full connector setup: register, authorize, exchange. */
export async function connect(idToken: string) {
  const { body: client } = await register();
  const clientId = client.client_id ?? '';
  const { verifier, challenge } = pkce();
  const back = await authorize({ clientId, idToken, challenge });
  const code = back.searchParams.get('code') ?? '';
  const { body } = await token({
    grant_type: 'authorization_code',
    code,
    code_verifier: verifier,
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    resource: RESOURCE,
  });
  return {
    clientId,
    code,
    verifier,
    accessToken: body.access_token ?? '',
    refreshToken: body.refresh_token ?? '',
  };
}

let rpcId = 0;

/** One stateless MCP JSON-RPC call through Hosting; returns status and the parsed message. */
export async function mcp(accessToken: string | null, method: string, params?: unknown) {
  const res = await fetch(`${HOSTING}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'mcp-protocol-version': '2025-06-18',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
  });
  const text = await res.text();
  const json = text.startsWith('{')
    ? text
    : (text
        .split('\n')
        .find((l) => l.startsWith('data: '))
        ?.slice(6) ?? 'null');
  return { status: res.status, headers: res.headers, message: JSON.parse(json) };
}

/** Calls a tool and returns its structuredContent, text and isError flag. */
export async function callTool(accessToken: string, name: string, args: unknown = {}) {
  const { message } = await mcp(accessToken, 'tools/call', { name, arguments: args });
  const result = message?.result as {
    structuredContent?: Record<string, unknown>;
    content?: { text: string }[];
    isError?: boolean;
  };
  return {
    data: result?.structuredContent ?? {},
    text: result?.content?.[0]?.text ?? '',
    isError: result?.isError === true,
  };
}
