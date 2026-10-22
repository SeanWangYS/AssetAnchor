import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { OAUTH_STORE } from './firestoreAdapter';
import { PROJECT, callTool, connect, mcp, signUp } from './testing/oauthClient';

/** End-to-end coverage of the edit and delete tools (add-mcp-transaction-edit). */

if (getApps().length === 0) initializeApp({ projectId: PROJECT });
const db = getFirestore();

const stamp = Date.now();
let dave: { uid: string; idToken: string };
let token: string;
const txCol = () => db.collection('users').doc(dave.uid).collection('transactions');

const tx = (id: string, date: string, symbol: string, type: 'BUY' | 'SELL', qty: string) =>
  txCol()
    .doc(id)
    .set({
      transaction_id: id,
      account_id: 'acc-e',
      transaction_date: date,
      symbol,
      market: 'TW',
      asset_type: 'STOCK',
      transaction_type: type,
      currency: 'TWD',
      quantity: `${qty}.0000000000`,
      price: '500.0000000000',
      total: '0.0000000000',
      fee: '0.0000000000',
      tax: '0.0000000000',
      notes: '',
      created_at: new Date('2025-01-01T00:00:00Z'),
    });

beforeAll(async () => {
  dave = await signUp(`dave-${stamp}@assetanchor.dev`);
  await db.collection('users').doc(dave.uid).collection('accounts').doc('acc-e').set({
    account_id: 'acc-e',
    account_name: 'acc-e',
    broker: 'OTHER',
    account_type: 'BROKERAGE',
    base_currency: 'TWD',
    market: 'TW',
    is_active: true,
    display_order: 1,
  });
  for (const id of ['TW_2330', 'TW_2317']) {
    await db
      .collection('symbols')
      .doc(id)
      .set({
        symbol_id: id,
        symbol: id.slice(3),
        market: 'TW',
        asset_type: 'STOCK',
        currency: 'TWD',
        name: id,
        name_zh: '',
      });
  }
  await tx('b1', '2025-01-02', '2330', 'BUY', '1000');
  await tx('s1', '2025-03-01', '2330', 'SELL', '500');
  await tx('b2', '2025-02-01', '2317', 'BUY', '100');
  token = (await connect(dave.idToken)).accessToken;
});

describe('tool annotations', () => {
  it('marks update and delete as destructive, previews as read-only', async () => {
    const { message } = await mcp(token, 'tools/list');
    const tools = message.result.tools as {
      name: string;
      annotations: { readOnlyHint: boolean; destructiveHint?: boolean };
    }[];
    const by = Object.fromEntries(tools.map((t) => [t.name, t.annotations]));
    expect(by.update_transaction?.destructiveHint).toBe(true);
    expect(by.delete_transactions?.destructiveHint).toBe(true);
    expect(by.preview_update_transaction?.readOnlyHint).toBe(true);
    expect(by.preview_delete_transactions?.readOnlyHint).toBe(true);
  });
});

describe('update_transaction', () => {
  it('previews and applies a confirmed edit, keeping created_at', async () => {
    const preview = await callTool(token, 'preview_update_transaction', {
      transaction_id: 'b2',
      changes: { quantity: '50' },
    });
    expect(preview.data).toMatchObject({
      status: 'ok',
      before: { quantity: '100.0000000000' },
      after: { quantity: '50.0000000000' },
    });
    const done = await callTool(token, 'update_transaction', {
      transaction_id: 'b2',
      changes: { quantity: '50' },
      confirmation_token: preview.data.confirmation_token,
    });
    expect(done.isError).toBe(false);
    const doc = (await txCol().doc('b2').get()).data();
    expect(doc).toMatchObject({ quantity: '50.0000000000', total: '25000.0000000000' });
    expect(doc?.created_at.toDate().toISOString()).toBe('2025-01-01T00:00:00.000Z');
    expect(doc?.updated_at).toBeDefined();
  });

  it('refuses an edit that leaves a later sell oversold', async () => {
    const preview = await callTool(token, 'preview_update_transaction', {
      transaction_id: 'b1',
      changes: { quantity: '100' },
    });
    expect(preview.data.status).toBe('oversell');
    expect(preview.data.message).toBe('修改後，2025-03-01 賣出 TW 2330 500 股會超賣（可賣 100）');
    expect(preview.data.confirmation_token).toBeNull();
  });

  it('rejects a stale confirmation after the app changed the transaction', async () => {
    const preview = await callTool(token, 'preview_update_transaction', {
      transaction_id: 'b2',
      changes: { price: '510' },
    });
    await txCol().doc('b2').update({ notes: '在 App 改過' });
    const r = await callTool(token, 'update_transaction', {
      transaction_id: 'b2',
      changes: { price: '510' },
      confirmation_token: preview.data.confirmation_token,
    });
    expect(r.text).toBe('交易在確認後已被修改，請重新預覽');
  });

  it('rejects a different edit than the one confirmed', async () => {
    const preview = await callTool(token, 'preview_update_transaction', {
      transaction_id: 'b2',
      changes: { price: '510' },
    });
    const r = await callTool(token, 'update_transaction', {
      transaction_id: 'b2',
      changes: { price: '999' },
      confirmation_token: preview.data.confirmation_token,
    });
    expect(r.text).toBe('內容與確認時不同，請重新預覽後再執行');
  });

  it("cannot see another user's transaction", async () => {
    const other = await signUp(`erin-${stamp}@assetanchor.dev`);
    const c = await connect(other.idToken);
    const r = await callTool(c.accessToken, 'preview_update_transaction', {
      transaction_id: 'b2',
      changes: { quantity: '1' },
    });
    expect(r.text).toBe('找不到交易');
  });
});

describe('delete_transactions', () => {
  it('refuses deleting a buy that a later sell depends on', async () => {
    const preview = await callTool(token, 'preview_delete_transactions', {
      transaction_ids: ['b1'],
    });
    expect(preview.data.issues).toEqual(['刪除後，2025-03-01 賣出 TW 2330 500 股會超賣（可賣 0）']);
    expect(preview.data.confirmation_token).toBeNull();
  });

  it('caps id deletes at 20', async () => {
    const r = await callTool(token, 'preview_delete_transactions', {
      transaction_ids: Array.from({ length: 21 }, (_, i) => `x${i}`),
    });
    expect(r.text).toBe('一次最多刪除 20 筆；要刪整批匯入請改用 import_batch_id');
  });

  it('names ids that do not exist', async () => {
    const r = await callTool(token, 'preview_delete_transactions', { transaction_ids: ['nope'] });
    expect(r.text).toBe('找不到交易：nope');
  });

  it('deletes a confirmed single transaction', async () => {
    const preview = await callTool(token, 'preview_delete_transactions', {
      transaction_ids: ['s1'],
    });
    expect(preview.data.count).toBe(1);
    const r = await callTool(token, 'delete_transactions', {
      transaction_ids: ['s1'],
      confirmation_token: preview.data.confirmation_token,
    });
    expect(r.data.deleted).toBe(1);
    expect((await txCol().doc('s1').get()).exists).toBe(false);
  });

  it('deletes a whole import batch and nothing else', async () => {
    const rows = [
      {
        transaction_date: '2025-06-01',
        symbol: '2330',
        market: 'TW',
        transaction_type: 'BUY',
        quantity: '1',
        price: '600',
      },
      {
        transaction_date: '2025-06-02',
        symbol: '2330',
        market: 'TW',
        transaction_type: 'BUY',
        quantity: '2',
        price: '600',
      },
    ];
    const v = await callTool(token, 'validate_transactions', {
      account_id: 'acc-e',
      transactions: rows,
    });
    const created = await callTool(token, 'create_transactions', {
      account_id: 'acc-e',
      transactions: rows,
      confirmation_token: v.data.confirmation_token,
    });
    const batchId = created.data.import_batch_id as string;
    const before = (await txCol().get()).size;

    const preview = await callTool(token, 'preview_delete_transactions', {
      import_batch_id: batchId,
    });
    expect(preview.data.count).toBe(2);
    const r = await callTool(token, 'delete_transactions', {
      import_batch_id: batchId,
      confirmation_token: preview.data.confirmation_token,
    });
    expect(r.data.deleted).toBe(2);
    expect((await txCol().get()).size).toBe(before - 2);
  });

  it('asks a read-only token to reconnect', async () => {
    const c = await connect(dave.idToken);
    await db
      .collection(OAUTH_STORE)
      .doc(`AccessToken_${c.accessToken}`)
      .update({ 'payload.scope': 'transactions.read' });
    const r = await callTool(c.accessToken, 'delete_transactions', {
      transaction_ids: ['b2'],
      confirmation_token: 'x~y',
    });
    expect(r.text).toBe('請在 Claude 重新連線 AssetAnchor 以授權寫入');
    expect((await txCol().doc('b2').get()).exists).toBe(true);
  });
});
