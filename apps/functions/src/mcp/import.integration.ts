import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { OAUTH_STORE } from './firestoreAdapter';
import { PROJECT, callTool, connect, signUp } from './testing/oauthClient';

/**
 * End-to-end coverage of the import tools (add-mcp-transaction-import) against the emulators.
 * The emulators use a fake symbol provider (MCP_FAKE_SYMBOL_PROVIDER) that knows US AAPL/VT/TSM
 * and TW 0056, so nothing reaches Yahoo.
 */

if (getApps().length === 0) initializeApp({ projectId: PROJECT });
const db = getFirestore();

const stamp = Date.now();
let carol: { uid: string; idToken: string };
let token: string;

const txCol = () => db.collection('users').doc(carol.uid).collection('transactions');

const row = (over: Record<string, unknown> = {}) => ({
  transaction_date: '2025-02-03',
  symbol: '2330',
  market: 'TW',
  transaction_type: 'BUY',
  quantity: '1000',
  price: '600',
  ...over,
});

beforeAll(async () => {
  carol = await signUp(`carol-${stamp}@assetanchor.dev`);
  const user = db.collection('users').doc(carol.uid);
  const account = (id: string, active: boolean) =>
    user.collection('accounts').doc(id).set({
      account_id: id,
      account_name: id,
      broker: 'OTHER',
      account_type: 'BROKERAGE',
      base_currency: 'TWD',
      market: 'TW',
      is_active: active,
      display_order: 1,
    });
  await account('acc-i', true);
  await account('acc-off', false);
  await txCol().doc('seed-buy').set({
    transaction_id: 'seed-buy',
    account_id: 'acc-i',
    transaction_date: '2025-01-02',
    symbol: '2330',
    market: 'TW',
    asset_type: 'STOCK',
    transaction_type: 'BUY',
    currency: 'TWD',
    quantity: '1000.0000000000',
    price: '580.0000000000',
    total: '580000.0000000000',
    fee: '0.0000000000',
    tax: '0.0000000000',
    notes: '',
  });
  await db.collection('symbols').doc('TW_2330').set({
    symbol_id: 'TW_2330',
    symbol: '2330',
    market: 'TW',
    asset_type: 'STOCK',
    currency: 'TWD',
    name: 'Taiwan Semiconductor',
    name_zh: '台積電',
  });
  token = (await connect(carol.idToken)).accessToken;
});

interface Report {
  status: string;
  message: string | null;
  new_symbol: boolean;
  row: Record<string, string> | null;
}

describe('validate_transactions', () => {
  it('normalizes a clean batch, flags new symbols and issues a confirmation token', async () => {
    const r = await callTool(token, 'validate_transactions', {
      account_id: 'acc-i',
      transactions: [row(), row({ symbol: 'aapl', market: 'US', price: '190.5', quantity: '3' })],
    });
    const rows = r.data.rows as Report[];
    expect(rows.map((x) => x.status)).toEqual(['ok', 'ok']);
    expect(rows[0]?.row).toMatchObject({
      price: '600.0000000000',
      currency: 'TWD',
      fee: '0.0000000000',
    });
    expect(rows[1]?.row).toMatchObject({ symbol: 'AAPL', currency: 'USD' });
    expect(rows.map((x) => x.new_symbol)).toEqual([false, true]);
    expect(r.data.confirmation_token).toEqual(expect.any(String));
  });

  it('reports duplicate, invalid and oversell rows without a token', async () => {
    const r = await callTool(token, 'validate_transactions', {
      account_id: 'acc-i',
      transactions: [
        row({ transaction_date: '2025-01-02', price: '580' }),
        row({ currency: 'USD' }),
        row({ transaction_type: 'SELL', quantity: '5000', transaction_date: '2025-03-01' }),
      ],
    });
    const rows = r.data.rows as Report[];
    expect(rows.map((x) => x.status)).toEqual(['duplicate', 'invalid', 'oversell']);
    expect(rows[1]?.message).toBe('台股交易幣別須為 TWD');
    expect(r.data.confirmation_token).toBeNull();
  });

  it('rejects a symbol that does not exist in that market', async () => {
    const r = await callTool(token, 'validate_transactions', {
      account_id: 'acc-i',
      transactions: [row({ symbol: '0050', market: 'US', price: '50' })],
    });
    expect((r.data.rows as Report[])[0]).toMatchObject({
      status: 'invalid',
      message: '找不到此代號，請確認代號與市場（若確定正確，請稍後再試）',
    });
  });

  it('caps a batch at 50 rows', async () => {
    const r = await callTool(token, 'validate_transactions', {
      account_id: 'acc-i',
      transactions: Array.from({ length: 51 }, () => row()),
    });
    expect(r.isError).toBe(true);
    expect(r.text).toBe('一次最多匯入 50 筆，請分批');
  });

  it('refuses inactive and unknown accounts', async () => {
    const off = await callTool(token, 'validate_transactions', {
      account_id: 'acc-off',
      transactions: [row()],
    });
    expect(off.text).toBe('此帳戶已停用，請先在 AssetAnchor App 啟用或選擇其他帳戶');
    const missing = await callTool(token, 'validate_transactions', {
      account_id: 'acc-nope',
      transactions: [row()],
    });
    expect(missing.text).toBe('找不到帳戶');
  });

  it('writes nothing', async () => {
    const before = (await txCol().get()).size;
    await callTool(token, 'validate_transactions', { account_id: 'acc-i', transactions: [row()] });
    expect((await txCol().get()).size).toBe(before);
  });
});

describe('create_transactions', () => {
  async function validated(transactions: Record<string, unknown>[]) {
    const v = await callTool(token, 'validate_transactions', { account_id: 'acc-i', transactions });
    return v.data.confirmation_token as string;
  }

  it('writes the confirmed batch atomically, like the app does', async () => {
    const batch = [
      row({ transaction_date: '2025-02-10' }),
      row({
        symbol: 'VT',
        market: 'US',
        asset_type: 'ETF',
        quantity: '2.5',
        price: '110.25',
        transaction_date: '2025-02-11',
      }),
    ];
    const confirmation_token = await validated(batch);
    const r = await callTool(token, 'create_transactions', {
      account_id: 'acc-i',
      transactions: batch,
      confirmation_token,
    });
    expect(r.isError).toBe(false);
    const ids = r.data.transaction_ids as string[];
    expect(ids).toHaveLength(2);

    const doc = (
      await txCol()
        .doc(ids[1] ?? '')
        .get()
    ).data();
    expect(doc).toMatchObject({
      transaction_id: ids[1],
      account_id: 'acc-i',
      symbol: 'VT',
      market: 'US',
      currency: 'USD',
      quantity: '2.5000000000',
      price: '110.2500000000',
      total: '275.6250000000',
      source: 'mcp',
      import_batch_id: r.data.import_batch_id,
    });
    expect(doc?.created_at).toBeDefined();

    const listed = await callTool(token, 'list_transactions', {
      import_batch_id: r.data.import_batch_id,
    });
    expect(
      (listed.data.transactions as { transaction_id: string }[])
        .map((t) => t.transaction_id)
        .sort(),
    ).toEqual([...ids].sort());
    expect((await db.collection('symbols').doc('US_VT').get()).exists).toBe(true);
  });

  it('rejects a list that differs from what was confirmed', async () => {
    const batch = [row({ transaction_date: '2025-02-12' })];
    const confirmation_token = await validated(batch);
    const before = (await txCol().get()).size;
    const r = await callTool(token, 'create_transactions', {
      account_id: 'acc-i',
      transactions: [row({ transaction_date: '2025-02-12', quantity: '100' })],
      confirmation_token,
    });
    expect(r.text).toBe('清單與確認時不同，請重新驗證後再匯入');
    expect((await txCol().get()).size).toBe(before);
  });

  it('re-checks holdings and rejects the whole batch if data changed', async () => {
    await txCol().doc('lone-buy').set({
      transaction_id: 'lone-buy',
      account_id: 'acc-i',
      transaction_date: '2025-04-01',
      symbol: 'TSM',
      market: 'US',
      asset_type: 'STOCK',
      transaction_type: 'BUY',
      currency: 'USD',
      quantity: '10.0000000000',
      price: '150.0000000000',
      total: '1500.0000000000',
      fee: '0.0000000000',
      tax: '0.0000000000',
      notes: '',
    });
    const batch = [
      row({ transaction_date: '2025-05-01' }),
      row({
        symbol: 'TSM',
        market: 'US',
        transaction_type: 'SELL',
        quantity: '10',
        price: '160',
        transaction_date: '2025-05-02',
      }),
    ];
    const confirmation_token = await validated(batch);
    await txCol().doc('lone-buy').delete();
    const r = await callTool(token, 'create_transactions', {
      account_id: 'acc-i',
      transactions: batch,
      confirmation_token,
    });
    expect(r.isError).toBe(true);
    expect(r.text).toContain('資料已變動，整批未匯入。第 2 列：超賣');
    const written = await txCol().where('transaction_date', '==', '2025-05-01').get();
    expect(written.size).toBe(0);
  });

  it('imports a duplicate only when the user keeps it', async () => {
    const dup = row({ transaction_date: '2025-01-02', price: '580', keep_duplicate: true });
    const confirmation_token = await validated([dup]);
    const r = await callTool(token, 'create_transactions', {
      account_id: 'acc-i',
      transactions: [dup],
      confirmation_token,
    });
    expect(r.data.count).toBe(1);
  });

  it('asks a read-only token to reconnect before writing', async () => {
    const c = await connect(carol.idToken);
    await db
      .collection(OAUTH_STORE)
      .doc(`AccessToken_${c.accessToken}`)
      .update({ 'payload.scope': 'transactions.read' });
    const r = await callTool(c.accessToken, 'create_transactions', {
      account_id: 'acc-i',
      transactions: [row()],
      confirmation_token: 'x.y',
    });
    expect(r.text).toBe('請在 Claude 重新連線 AssetAnchor 以授權寫入');
  });
});
