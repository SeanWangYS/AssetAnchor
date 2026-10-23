import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ACCOUNT_TYPES } from '../../packages/shared/src/enums/account-types';
import { ASSET_TYPES } from '../../packages/shared/src/enums/asset-types';
import { BROKERS } from '../../packages/shared/src/enums/brokers';
import { MARKETS } from '../../packages/shared/src/enums/markets';
import { transactionInputSchema } from '../../packages/shared/src/schemas/transaction';
import { buildTransactionDoc } from '../../packages/shared/src/transactions/buildTransactionDoc';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-assetanchor',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

const aliceDb = () => testEnv.authenticatedContext('alice').firestore();

/** Seeds a document bypassing rules (the state a previous valid write left behind). */
async function seed(path: string, data: Record<string, unknown>): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });
}

const past = Timestamp.fromDate(new Date('2026-01-01T00:00:00Z'));

// ---- Valid payloads, shaped exactly like the mobile writers ----

function newUser(uid = 'alice') {
  return {
    uid,
    email: 'alice@example.com',
    display_name: '',
    preferred_display_currency: 'TWD',
    preferred_locale: 'zh-TW',
    settings: { theme: 'auto', default_account_id: null },
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
}

function storedUser() {
  return { ...newUser(), created_at: past, updated_at: past };
}

function newAccount(id = 'a1') {
  return {
    account_id: id,
    account_name: 'Firstrade',
    broker: 'FIRSTRADE',
    account_type: 'BROKERAGE',
    base_currency: 'USD',
    market: 'US',
    cash_balances: {},
    cash_balances_updated_at: serverTimestamp(),
    is_active: true,
    display_order: 1,
    color: '#7C5CFF',
    notes: '',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
}

function storedAccount(id = 'a1') {
  return {
    ...newAccount(id),
    cash_balances_updated_at: past,
    created_at: past,
    updated_at: past,
  };
}

/** Builder fields exactly as the app and the MCP tools write them (shared buildTransactionDoc). */
function txFields() {
  const input = transactionInputSchema.parse({
    account_id: 'a1',
    symbol: 'vti',
    market: 'US',
    asset_type: 'ETF',
    transaction_type: 'BUY',
    transaction_date: '2026-10-01',
    currency: 'USD',
    quantity: '10',
    price: '250.12',
  });
  const { transaction_id: _id, ...fields } = buildTransactionDoc(input, {
    transactionId: 'unused',
  });
  return fields;
}

function newTx(id = 't1') {
  return {
    transaction_id: id,
    ...txFields(),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
}

function storedTx(id = 't1', extra: Record<string, unknown> = {}) {
  return { ...newTx(id), created_at: past, updated_at: past, ...extra };
}

describe('users/{uid} 隔離（§7）', () => {
  it('使用者可建立、讀取自己的 doc', async () => {
    const alice = aliceDb();
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), newUser()));
    await assertSucceeds(getDoc(doc(alice, 'users/alice')));
  });

  it('使用者不能讀或建立別人的 doc', async () => {
    const alice = aliceDb();
    await assertFails(getDoc(doc(alice, 'users/bob')));
    await assertFails(setDoc(doc(alice, 'users/bob'), newUser('bob')));
  });

  it('未登入不能讀使用者 doc', async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'users/alice')));
  });

  it('使用者不能寫未知的 subcollection', async () => {
    const alice = aliceDb();
    await assertFails(setDoc(doc(alice, 'users/alice/notes/n1'), { text: 'x' }));
  });
});

describe('users/{uid} 欄位驗證（validate-firestore-writes）', () => {
  it('建立：多餘欄位、uid 不符、未知幣別、非 serverTimestamp 皆拒絕', async () => {
    const alice = aliceDb();
    await assertFails(setDoc(doc(alice, 'users/alice'), { ...newUser(), is_admin: true }));
    await assertFails(setDoc(doc(alice, 'users/alice'), { ...newUser(), uid: 'bob' }));
    await assertFails(
      setDoc(doc(alice, 'users/alice'), { ...newUser(), preferred_display_currency: 'JPY' }),
    );
    await assertFails(setDoc(doc(alice, 'users/alice'), { ...newUser(), created_at: past }));
    const { settings: _s, ...noSettings } = newUser();
    await assertFails(setDoc(doc(alice, 'users/alice'), noSettings));
  });

  it('更新暱稱：1–50 字可、空字串或超長拒絕', async () => {
    await seed('users/alice', storedUser());
    const alice = aliceDb();
    const ref = doc(alice, 'users/alice');
    await assertSucceeds(updateDoc(ref, { display_name: 'Sean', updated_at: serverTimestamp() }));
    await assertFails(updateDoc(ref, { display_name: '', updated_at: serverTimestamp() }));
    await assertFails(
      updateDoc(ref, { display_name: 'x'.repeat(51), updated_at: serverTimestamp() }),
    );
  });

  it('更新顯示幣別：TWD/USD 可、其他拒絕；不可改 uid / email', async () => {
    await seed('users/alice', storedUser());
    const ref = doc(aliceDb(), 'users/alice');
    await assertSucceeds(
      updateDoc(ref, { preferred_display_currency: 'USD', updated_at: serverTimestamp() }),
    );
    await assertFails(
      updateDoc(ref, { preferred_display_currency: 'USDT', updated_at: serverTimestamp() }),
    );
    await assertFails(updateDoc(ref, { uid: 'bob', updated_at: serverTimestamp() }));
    await assertFails(updateDoc(ref, { email: 'x@y.z', updated_at: serverTimestamp() }));
    await assertFails(updateDoc(ref, { preferred_display_currency: 'TWD' }));
  });

  it('使用者不能刪除自己的 doc', async () => {
    await seed('users/alice', storedUser());
    await assertFails(deleteDoc(doc(aliceDb(), 'users/alice')));
  });
});

describe('accounts 欄位驗證', () => {
  it('建立第一個帳戶：帳戶 + 使用者預設帳戶在同一 batch（暱稱為空也可）', async () => {
    await seed('users/alice', storedUser());
    const alice = aliceDb();
    const batch = writeBatch(alice);
    batch.set(doc(alice, 'users/alice/accounts/a1'), newAccount());
    batch.update(doc(alice, 'users/alice'), {
      'settings.default_account_id': 'a1',
      updated_at: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });

  it('建立：account_id 與 doc id 不符、未知券商、壞色碼、超長名稱皆拒絕', async () => {
    const alice = aliceDb();
    const ref = doc(alice, 'users/alice/accounts/a1');
    await assertFails(setDoc(ref, { ...newAccount(), account_id: 'a2' }));
    await assertFails(setDoc(ref, { ...newAccount(), broker: 'ACME' }));
    await assertFails(setDoc(ref, { ...newAccount(), color: 'red' }));
    await assertFails(setDoc(ref, { ...newAccount(), account_name: '' }));
    await assertFails(setDoc(ref, { ...newAccount(), account_name: 'x'.repeat(101) }));
    await assertFails(setDoc(ref, { ...newAccount(), cash_balances: { USD: 100 } }));
    await assertFails(setDoc(ref, { ...newAccount(), extra: 1 }));
  });

  it('不能寫別人的 account', async () => {
    await assertFails(setDoc(doc(aliceDb(), 'users/bob/accounts/b1'), newAccount('b1')));
  });

  it('編輯、現金餘額（可為負）、停用皆可；改 account_id / display_order 拒絕', async () => {
    await seed('users/alice/accounts/a1', storedAccount());
    const ref = doc(aliceDb(), 'users/alice/accounts/a1');
    await assertSucceeds(
      updateDoc(ref, { account_name: 'IBKR', notes: 'main', updated_at: serverTimestamp() }),
    );
    await assertSucceeds(
      updateDoc(ref, {
        cash_balances: { USD: '-12.5000000000', TWD: '1000.0000000000' },
        cash_balances_updated_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      }),
    );
    await assertSucceeds(updateDoc(ref, { is_active: false, updated_at: serverTimestamp() }));
    await assertFails(
      updateDoc(ref, { cash_balances: { JPY: '1.0000000000' }, updated_at: serverTimestamp() }),
    );
    await assertFails(updateDoc(ref, { account_id: 'zz', updated_at: serverTimestamp() }));
    await assertFails(updateDoc(ref, { display_order: 9, updated_at: serverTimestamp() }));
  });

  it('不能刪除 account（軟刪除用 is_active）', async () => {
    await seed('users/alice/accounts/a1', storedAccount());
    await assertFails(deleteDoc(doc(aliceDb(), 'users/alice/accounts/a1')));
  });

  it('shared enum 的每個值都被 rules 接受', async () => {
    const alice = aliceDb();
    for (const broker of BROKERS) {
      await assertSucceeds(
        setDoc(doc(alice, `users/alice/accounts/b_${broker}`), {
          ...newAccount(`b_${broker}`),
          broker,
        }),
      );
    }
    for (const account_type of ACCOUNT_TYPES) {
      await assertSucceeds(
        setDoc(doc(alice, `users/alice/accounts/t_${account_type}`), {
          ...newAccount(`t_${account_type}`),
          account_type,
        }),
      );
    }
    for (const market of MARKETS) {
      await assertSucceeds(
        setDoc(doc(alice, `users/alice/accounts/m_${market}`), {
          ...newAccount(`m_${market}`),
          market,
        }),
      );
    }
  });
});

describe('transactions 欄位驗證', () => {
  it('使用者可建立、讀取、刪除自己的 transaction', async () => {
    const alice = aliceDb();
    const ref = doc(alice, 'users/alice/transactions/t1');
    await assertSucceeds(setDoc(ref, newTx()));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(deleteDoc(ref));
  });

  it('不能讀寫別人的 transaction；未登入不能讀寫', async () => {
    const alice = aliceDb();
    await assertFails(getDoc(doc(alice, 'users/bob/transactions/t1')));
    await assertFails(setDoc(doc(alice, 'users/bob/transactions/t1'), newTx()));
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'users/alice/transactions/t1')));
    await assertFails(setDoc(doc(anon, 'users/alice/transactions/t1'), newTx()));
  });

  it('建立：金額非 10 位小數字串、負數、未知型別、壞日期皆拒絕', async () => {
    const ref = doc(aliceDb(), 'users/alice/transactions/t1');
    const bad: Record<string, unknown>[] = [
      { quantity: 10 },
      { quantity: '10' },
      { price: '1e3' },
      { price: '-1.0000000000' },
      { fee: '0.00000000001' },
      { transaction_type: 'DIVIDEND' },
      { currency: 'JPY' },
      { market: 'HK' },
      { asset_type: 'OPTION' },
      { transaction_date: '2026/10/01' },
      { symbol: '' },
      { symbol: 'X'.repeat(33) },
      { notes: 'n'.repeat(1001) },
      { transaction_id: 't2' },
      { ex_date: '2026-10-01' },
    ];
    for (const patch of bad) await assertFails(setDoc(ref, { ...newTx(), ...patch }));
  });

  it('client 不能自稱 MCP 匯入（source / import_batch_id）', async () => {
    const ref = doc(aliceDb(), 'users/alice/transactions/t1');
    await assertFails(setDoc(ref, { ...newTx(), source: 'mcp' }));
    await assertFails(setDoc(ref, { ...newTx(), import_batch_id: 'imp_x' }));
  });

  it('編輯（merge 全部 builder 欄位）可；保留 MCP 欄位；不可改 created_at / source', async () => {
    await seed(
      'users/alice/transactions/t1',
      storedTx('t1', { source: 'mcp', import_batch_id: 'imp_abcdefghijkl' }),
    );
    const ref = doc(aliceDb(), 'users/alice/transactions/t1');
    await assertSucceeds(
      setDoc(
        ref,
        { ...txFields(), quantity: '12.0000000000', updated_at: serverTimestamp() },
        { merge: true },
      ),
    );
    await assertFails(
      setDoc(ref, { ...txFields(), source: 'app', updated_at: serverTimestamp() }, { merge: true }),
    );
    await assertFails(
      setDoc(
        ref,
        { ...txFields(), created_at: serverTimestamp(), updated_at: serverTimestamp() },
        {
          merge: true,
        },
      ),
    );
    await assertFails(
      setDoc(ref, { ...txFields(), price: 'abc', updated_at: serverTimestamp() }, { merge: true }),
    );
  });

  it('shared ASSET_TYPES 的每個值都被 rules 接受', async () => {
    const alice = aliceDb();
    for (const asset_type of ASSET_TYPES) {
      await assertSucceeds(
        setDoc(doc(alice, `users/alice/transactions/x_${asset_type}`), {
          ...newTx(`x_${asset_type}`),
          asset_type,
        }),
      );
    }
  });
});

describe('全域 collection（§7）', () => {
  it('登入者可讀 exchange_rates、client 不能寫（只有後端 Admin SDK 可寫）', async () => {
    const alice = aliceDb();
    await assertSucceeds(getDoc(doc(alice, 'exchange_rates/2026-06-12')));
    await assertFails(
      setDoc(doc(alice, 'exchange_rates/2026-06-12'), {
        date: '2026-06-12',
        source: 'BOT',
        rate_type: 'spot_sell',
        rates: { USD_TWD: '31.6800000000', TWD_USD: '0.0315656566' },
        is_estimated: false,
      }),
    );
  });

  it('未登入不能讀 exchange_rates', async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'exchange_rates/2026-06-12')));
  });

  it('登入者可讀 symbols；client 不能建立、更新或刪除（只有後端寫入）', async () => {
    const alice = aliceDb();
    await assertSucceeds(getDoc(doc(alice, 'symbols/US_AAPL')));
    await assertFails(setDoc(doc(alice, 'symbols/US_AAPL'), { symbol: 'AAPL' }));
    await seed('symbols/US_AAPL', { symbol: 'AAPL' });
    await assertFails(setDoc(doc(alice, 'symbols/US_AAPL'), { name: 'Apple Inc.' }));
    await assertFails(deleteDoc(doc(alice, 'symbols/US_AAPL')));
  });

  it('未登入不能讀或建立 symbols', async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'symbols/US_AAPL')));
    await assertFails(setDoc(doc(anon, 'symbols/US_AAPL'), { symbol: 'AAPL' }));
  });

  it('登入者可讀 quotes、不能寫', async () => {
    const alice = aliceDb();
    await assertSucceeds(getDoc(doc(alice, 'quotes/AAPL')));
    await assertFails(setDoc(doc(alice, 'quotes/AAPL'), { price: '1' }));
  });

  it('登入者可讀 price_history、不能寫（含 FX pseudo-symbol）', async () => {
    const alice = aliceDb();
    await assertSucceeds(getDoc(doc(alice, 'price_history/TW_2330_2025')));
    await assertSucceeds(getDoc(doc(alice, 'price_history/FX_USDTWD_2025')));
    await assertFails(
      setDoc(doc(alice, 'price_history/TW_2330_2025'), { closes: { '2025-01-02': '1' } }),
    );
  });

  it('未登入不能讀 price_history', async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'price_history/TW_2330_2025')));
  });
});

describe('oauth_store 後端專用（add-mcp-auth-readonly）', () => {
  it('已登入使用者不能讀寫 oauth_store', async () => {
    const alice = aliceDb();
    await assertFails(getDoc(doc(alice, 'oauth_store/AccessToken_x')));
    await assertFails(setDoc(doc(alice, 'oauth_store/AccessToken_x'), { model: 'AccessToken' }));
    await assertFails(deleteDoc(doc(alice, 'oauth_store/AccessToken_x')));
  });

  it('未登入不能讀寫 oauth_store', async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'oauth_store/Client_x')));
    await assertFails(setDoc(doc(anon, 'oauth_store/Client_x'), { model: 'Client' }));
  });
});
