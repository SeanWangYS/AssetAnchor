import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { revokeAllForAccount, OAUTH_STORE } from './firestoreAdapter';
import {
  FN,
  HOSTING,
  REDIRECT_URI,
  RESOURCE,
  PROJECT,
  authorize,
  callTool,
  connect,
  mcp,
  pkce,
  register,
  signUp,
  token,
} from './testing/oauthClient';

/**
 * End-to-end coverage of specs mcp-authorization and mcp-server against the emulators.
 * Run: pnpm --filter @assetanchor/functions test:integration
 */

if (getApps().length === 0) initializeApp({ projectId: PROJECT });
const db = getFirestore();

const stamp = Date.now();
let alice: { uid: string; idToken: string };
let bob: { uid: string; idToken: string };
let aliceToken: string;

async function seed(uid: string) {
  const user = db.collection('users').doc(uid);
  const account = (id: string, name: string, order: number, active = true) =>
    user.collection('accounts').doc(id).set({
      account_id: id,
      account_name: name,
      broker: 'FIRSTRADE',
      account_type: 'BROKERAGE',
      base_currency: 'USD',
      market: 'US',
      is_active: active,
      display_order: order,
    });
  await account('acc-b', '第二帳戶', 2);
  await account('acc-a', '主帳戶', 1);
  await account('acc-old', '舊帳戶', 3, false);

  const tx = (id: string, date: string, symbol: string, market: 'TW' | 'US', accountId = 'acc-a') =>
    user
      .collection('transactions')
      .doc(id)
      .set({
        transaction_id: id,
        account_id: accountId,
        transaction_date: date,
        symbol,
        market,
        asset_type: 'STOCK',
        transaction_type: 'BUY',
        currency: market === 'TW' ? 'TWD' : 'USD',
        quantity: '1000.0000000000',
        price: '580.0000000000',
        total: '580000.0000000000',
        fee: '0.0000000000',
        tax: '0.0000000000',
        notes: '',
      });
  await tx('tw-1', '2025-01-02', '2330', 'TW');
  await tx('tw-2', '2025-03-01', '2330', 'TW', 'acc-b');
  await tx('us-1', '2024-12-01', 'AAPL', 'US');
  const batch = db.batch();
  for (let i = 0; i < 130; i += 1) {
    const id = `bulk-${String(i).padStart(3, '0')}`;
    batch.set(user.collection('transactions').doc(id), {
      transaction_id: id,
      account_id: 'acc-b',
      transaction_date: '2023-06-01',
      symbol: 'VT',
      market: 'US',
      asset_type: 'ETF',
      transaction_type: 'BUY',
      currency: 'USD',
      quantity: '1.0000000000',
      price: '100.0000000000',
      total: '100.0000000000',
      fee: '0.0000000000',
      tax: '0.0000000000',
      notes: '',
    });
  }
  await batch.commit();

  const symbols = db.collection('symbols');
  await symbols.doc('TW_2330').set({
    symbol_id: 'TW_2330',
    symbol: '2330',
    market: 'TW',
    asset_type: 'STOCK',
    currency: 'TWD',
    name: 'Taiwan Semiconductor',
    name_zh: '台積電',
  });
  await symbols.doc('TW_0050').set({
    symbol_id: 'TW_0050',
    symbol: '0050',
    market: 'TW',
    asset_type: 'ETF',
    currency: 'TWD',
    name: 'Yuanta Taiwan 50',
    name_zh: '元大台灣50',
  });
}

beforeAll(async () => {
  alice = await signUp(`alice-${stamp}@assetanchor.dev`);
  bob = await signUp(`bob-${stamp}@assetanchor.dev`);
  await seed(alice.uid);
  aliceToken = (await connect(alice.idToken)).accessToken;
});

describe('mcp-authorization', () => {
  it('challenges an unauthenticated MCP call with the resource metadata URL', async () => {
    const { status, headers } = await mcp(null, 'tools/list');
    expect(status).toBe(401);
    expect(headers.get('www-authenticate')).toContain(
      `resource_metadata="${HOSTING}/.well-known/oauth-protected-resource/mcp"`,
    );
  });

  it('serves protected resource metadata through Hosting', async () => {
    const res = await fetch(`${HOSTING}/.well-known/oauth-protected-resource/mcp`);
    expect(await res.json()).toMatchObject({
      resource: RESOURCE,
      authorization_servers: [FN],
      scopes_supported: ['transactions.read', 'transactions.write'],
    });
  });

  it('serves authorization server metadata with S256 PKCE', async () => {
    const res = await fetch(`${FN}/.well-known/oauth-authorization-server`);
    const meta = (await res.json()) as Record<string, unknown>;
    expect(meta).toMatchObject({
      issuer: FN,
      authorization_endpoint: `${FN}/auth`,
      token_endpoint: `${FN}/token`,
      registration_endpoint: `${FN}/reg`,
    });
    expect(meta.code_challenge_methods_supported).toContain('S256');
  });

  it('registers clients with https redirect URIs and rejects others', async () => {
    expect((await register()).body.client_id).toEqual(expect.any(String));
    const bad = await register(['http://evil.example/cb']);
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe('invalid_redirect_uri');
    expect((await register(['claude://cb'])).status).toBe(400);
  });

  it('accepts registrations that omit scope or carry the connector scopes', async () => {
    expect((await register(undefined, undefined)).status).toBe(201);
    const withScopes = await register(undefined, 'transactions.read transactions.write');
    expect(withScopes.status).toBe(201);
    expect(withScopes.body.client_id).toEqual(expect.any(String));
  });

  it('rejects an authorization request without PKCE', async () => {
    const { body } = await register();
    const back = await authorize({ clientId: body.client_id ?? '', idToken: alice.idToken });
    expect(back.searchParams.get('error')).toBe('invalid_request');
  });

  it('refuses a forged ID token at login', async () => {
    const { body } = await register();
    await expect(
      authorize({ clientId: body.client_id ?? '', idToken: 'forged', challenge: pkce().challenge }),
    ).rejects.toThrow('login failed 401');
  });

  it('refuses login posts from other origins', async () => {
    const res = await fetch(`${FN}/interaction/whatever/firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
      body: JSON.stringify({ idToken: alice.idToken }),
    });
    expect(res.status).toBe(403);
  });

  it('returns access_denied when the user refuses', async () => {
    const { body } = await register();
    const back = await authorize({
      clientId: body.client_id ?? '',
      idToken: alice.idToken,
      challenge: pkce().challenge,
      deny: true,
    });
    expect(back.origin + back.pathname).toBe(REDIRECT_URI);
    expect(back.searchParams.get('error')).toBe('access_denied');
    expect(back.searchParams.get('code')).toBeNull();
  });

  it('issues one-hour opaque tokens and rotates refresh tokens', async () => {
    const c = await connect(alice.idToken);
    expect(c.accessToken).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    const refreshed = await token({
      grant_type: 'refresh_token',
      refresh_token: c.refreshToken,
      client_id: c.clientId,
      resource: RESOURCE,
    });
    expect(refreshed.body.expires_in).toBe(3600);
    expect(refreshed.body.refresh_token).not.toBe(c.refreshToken);
    const reused = await token({
      grant_type: 'refresh_token',
      refresh_token: c.refreshToken,
      client_id: c.clientId,
    });
    expect(reused.body.error).toBe('invalid_grant');
  });

  it('grants every connector scope when the client omits scope', async () => {
    const { body } = await register();
    const { verifier, challenge } = pkce();
    const back = await authorize({
      clientId: body.client_id ?? '',
      idToken: alice.idToken,
      challenge,
      scope: null,
    });
    const res = await token({
      grant_type: 'authorization_code',
      code: back.searchParams.get('code') ?? '',
      code_verifier: verifier,
      client_id: body.client_id ?? '',
      redirect_uri: REDIRECT_URI,
      resource: RESOURCE,
    });
    expect(res.body.scope?.split(' ').sort()).toEqual(['transactions.read', 'transactions.write']);
  });

  it('rejects a reused authorization code', async () => {
    const c = await connect(alice.idToken);
    const again = await token({
      grant_type: 'authorization_code',
      code: c.code,
      code_verifier: c.verifier,
      client_id: c.clientId,
      redirect_uri: REDIRECT_URI,
    });
    expect(again.body.error).toBe('invalid_grant');
  });

  it('treats an expired access token as invalid', async () => {
    const c = await connect(alice.idToken);
    await db
      .collection(OAUTH_STORE)
      .doc(`AccessToken_${c.accessToken}`)
      .update({ expires_at: new Date(Date.now() - 1000) });
    expect((await mcp(c.accessToken, 'tools/list')).status).toBe(401);
  });

  it('refuses refresh once the 30-day lifetime has passed', async () => {
    const c = await connect(alice.idToken);
    await db
      .collection(OAUTH_STORE)
      .doc(`RefreshToken_${c.refreshToken}`)
      .update({ expires_at: new Date(Date.now() - 1000) });
    const res = await token({
      grant_type: 'refresh_token',
      refresh_token: c.refreshToken,
      client_id: c.clientId,
    });
    expect(res.body.error).toBe('invalid_grant');
  });

  it('cuts off every token when an admin revokes the user', async () => {
    const victim = await signUp(`revoke-${stamp}@assetanchor.dev`);
    const c = await connect(victim.idToken);
    expect((await mcp(c.accessToken, 'tools/list')).status).toBe(200);
    expect(await revokeAllForAccount(db, victim.uid)).toBeGreaterThan(0);
    expect((await mcp(c.accessToken, 'tools/list')).status).toBe(401);
    const refreshed = await token({
      grant_type: 'refresh_token',
      refresh_token: c.refreshToken,
      client_id: c.clientId,
    });
    expect(refreshed.body.error).toBe('invalid_grant');
  });
});

describe('mcp-server', () => {
  it('marks the read tools read-only and create_transactions as a write', async () => {
    const { message } = await mcp(aliceToken, 'tools/list');
    const tools = message.result.tools as {
      name: string;
      annotations: { readOnlyHint: boolean };
    }[];
    const byName = Object.fromEntries(tools.map((t) => [t.name, t.annotations.readOnlyHint]));
    expect(byName).toMatchObject({
      list_accounts: true,
      list_transactions: true,
      search_symbol: true,
      validate_transactions: true,
      create_transactions: false,
    });
  });

  it('lists active accounts in display order', async () => {
    const { data } = await callTool(aliceToken, 'list_accounts');
    expect((data.accounts as { account_id: string }[]).map((a) => a.account_id)).toEqual([
      'acc-a',
      'acc-b',
    ]);
    const all = await callTool(aliceToken, 'list_accounts', { include_inactive: true });
    expect(all.data.accounts).toHaveLength(3);
  });

  it('tells a user without accounts to create one in the app', async () => {
    const c = await connect(bob.idToken);
    const { data } = await callTool(c.accessToken, 'list_accounts');
    expect(data).toEqual({ accounts: [], hint: '請先在 AssetAnchor App 建立帳戶' });
  });

  it('queries transactions by symbol and date with decimal strings', async () => {
    const { data } = await callTool(aliceToken, 'list_transactions', {
      symbol: '2330',
      market: 'TW',
      date_from: '2025-01-01',
    });
    const txs = data.transactions as { transaction_id: string; price: string }[];
    expect(txs.map((t) => t.transaction_id)).toEqual(['tw-2', 'tw-1']);
    expect(txs[0]?.price).toBe('580.0000000000');
  });

  it('pages through many transactions', async () => {
    const first = await callTool(aliceToken, 'list_transactions', { account_id: 'acc-b' });
    expect(first.data.transactions).toHaveLength(50);
    const second = await callTool(aliceToken, 'list_transactions', {
      account_id: 'acc-b',
      cursor: first.data.next_cursor,
    });
    expect(second.data.transactions).toHaveLength(50);
  });

  it('rejects a reversed date range', async () => {
    const r = await callTool(aliceToken, 'list_transactions', {
      date_from: '2025-12-31',
      date_to: '2025-01-01',
    });
    expect(r.isError).toBe(true);
    expect(r.text).toBe('起始日期不可晚於結束日期');
  });

  it("never reveals another user's account", async () => {
    const c = await connect(bob.idToken);
    const r = await callTool(c.accessToken, 'list_transactions', { account_id: 'acc-a' });
    expect(r.isError).toBe(true);
    expect(r.text).toBe('找不到帳戶');
  });

  it('maps codes and owned names to symbols', async () => {
    const byCode = await callTool(aliceToken, 'search_symbol', { query: '0050' });
    expect((byCode.data.symbols as { symbol_id: string }[])[0]).toMatchObject({
      symbol_id: 'TW_0050',
      market: 'TW',
      currency: 'TWD',
    });
    const byName = await callTool(aliceToken, 'search_symbol', { query: '台積電' });
    expect((byName.data.symbols as { symbol_id: string }[]).map((s) => s.symbol_id)).toContain(
      'TW_2330',
    );
  });

  it('reports unknown symbols without creating them', async () => {
    const r = await callTool(aliceToken, 'search_symbol', { query: 'ZZZZ' });
    expect(r.data).toEqual({ symbols: [], hint: 'AssetAnchor 尚無此代號' });
    for (const m of ['TW', 'US', 'CRYPTO', 'OTHER']) {
      expect((await db.collection('symbols').doc(`${m}_ZZZZ`).get()).exists).toBe(false);
    }
  });
});
